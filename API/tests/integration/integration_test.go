// Pacote de testes de integração (requer PostgreSQL).
//
// Executar:
//
//	DB_DSN="postgres://user:pass@localhost:5432/dbname?sslmode=disable" JWT_SECRET="uma-chave-secreta-com-tamanho-suficiente-32" go test -tags=integration -v -count=1 ./tests/integration/
//
//go:build integration

package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/utils"
	"github.com/ferrariwill/Clinicas/API/database"
	"github.com/ferrariwill/Clinicas/API/routes"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// TestFluxoPrincipalMedico valida login de médico, conflito de agenda (409) e imutabilidade do prontuário após 24h (409 na edição).
func TestFluxoPrincipalMedico(t *testing.T) {
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		t.Skip("defina DB_DSN para executar testes de integração (PostgreSQL)")
	}
	if os.Getenv("JWT_SECRET") == "" {
		_ = os.Setenv("JWT_SECRET", "chave-jwt-teste-integracao-com-tamanho-minimo-seguro-32")
	}

	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("conectar ao banco: %v", err)
	}

	database.RunMigrations(db)

	var clinica models.Clinica
	if err := db.Where("cnpj = ?", "00.000.000/0001-00").First(&clinica).Error; err != nil {
		t.Fatalf("clínica seed não encontrada (rode migrations): %v", err)
	}

	sufixo := fmt.Sprintf("%d", time.Now().UnixNano())
	if len(sufixo) < 16 {
		sufixo = sufixo + "0000000000000000"
	}

	tipoMedico := models.TipoUsuario{
		Nome:      "Médico Integração " + sufixo,
		Descricao: "Papel médico para teste",
		Papel:     rbac.PapelMedico,
		ClinicaID: clinica.ID,
	}
	if err := db.Create(&tipoMedico).Error; err != nil {
		t.Fatalf("criar tipo médico: %v", err)
	}
	t.Cleanup(func() { db.Unscoped().Delete(&tipoMedico) })

	hash, err := utils.HashSenha("SenhaIntegracao!1")
	if err != nil {
		t.Fatalf("hash senha: %v", err)
	}
	emailMedico := fmt.Sprintf("medico.integration.%s@test.local", sufixo)
	medico := models.Usuario{
		Nome:          "Dr. Integração",
		Email:         emailMedico,
		Senha:         hash,
		Ativo:         true,
		ClinicaID:     clinica.ID,
		TipoUsuarioID: tipoMedico.ID,
	}
	if err := db.Create(&medico).Error; err != nil {
		t.Fatalf("criar usuário médico: %v", err)
	}
	t.Cleanup(func() { db.Unscoped().Delete(&medico) })

	p1 := models.Paciente{
		Nome: "Paciente Um " + sufixo, CPF: fmt.Sprintf("111.%s.%s-%s", sufixo[0:3], sufixo[3:6], sufixo[6:8]),
		ClinicaID: clinica.ID, Ativo: true, Email: "p1@test.local",
	}
	p2 := models.Paciente{
		Nome: "Paciente Dois " + sufixo, CPF: fmt.Sprintf("222.%s.%s-%s", sufixo[8:11], sufixo[11:14], sufixo[14:16]),
		ClinicaID: clinica.ID, Ativo: true, Email: "p2@test.local",
	}
	if err := db.Create(&p1).Error; err != nil {
		t.Fatalf("paciente 1: %v", err)
	}
	if err := db.Create(&p2).Error; err != nil {
		t.Fatalf("paciente 2: %v", err)
	}
	t.Cleanup(func() {
		db.Unscoped().Delete(&p2)
		db.Unscoped().Delete(&p1)
	})

	proc := models.Procedimento{
		Nome: "Consulta integração", Valor: 100, Duracao: 30,
		ClinicaID: clinica.ID, Ativo: true,
	}
	if err := db.Create(&proc).Error; err != nil {
		t.Fatalf("procedimento: %v", err)
	}
	t.Cleanup(func() { db.Unscoped().Delete(&proc) })

	// Próximo dia útil às 10:00 (horário dentro do expediente configurado abaixo).
	slot := proximoHorarioAgendavel(t)

	dia := int(slot.Weekday())
	uh := models.UsuarioHorario{
		UsuarioID: medico.ID, DiaSemana: dia,
		HorarioInicio: "08:00", HorarioFim: "18:00", Ativo: true,
	}
	if err := db.Create(&uh).Error; err != nil {
		t.Fatalf("horário do profissional: %v", err)
	}
	t.Cleanup(func() { db.Unscoped().Delete(&uh) })

	var statusAgendado models.StatusAgendamento
	if err := db.Where("nome = ?", "Agendado").First(&statusAgendado).Error; err != nil {
		t.Fatalf("status Agendado: %v", err)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	routes.SetupRoutes(r, db)

	token := login(t, r, emailMedico, "SenhaIntegracao!1")
	auth := "Bearer " + token

	// 1) Primeiro agendamento
	body1 := map[string]any{
		"paciente_id":     p1.ID,
		"usuario_id":      medico.ID,
		"procedimento_id": proc.ID,
		"data_hora":       slot.Format(time.RFC3339Nano),
		"status_id":       statusAgendado.ID,
		"observacoes":     "primeiro",
	}
	res1 := postJSON(t, r, "POST", "/clinicas/agenda", body1, auth)
	if res1.Code != http.StatusCreated {
		t.Fatalf("primeiro agendamento: esperado 201, obteve %d: %s", res1.Code, res1.Body.String())
	}

	// 2) Segundo agendamento no mesmo horário (conflito) → 409
	body2 := map[string]any{
		"paciente_id":     p2.ID,
		"usuario_id":      medico.ID,
		"procedimento_id": proc.ID,
		"data_hora":       slot.Format(time.RFC3339Nano),
		"status_id":       statusAgendado.ID,
		"observacoes":     "conflito",
	}
	res2 := postJSON(t, r, "POST", "/clinicas/agenda", body2, auth)
	if res2.Code != http.StatusConflict {
		t.Fatalf("agendamento conflitante: esperado 409, obteve %d: %s", res2.Code, res2.Body.String())
	}

	// 3) Prontuário
	bodyPront := map[string]any{
		"paciente_id": p1.ID,
		"titulo":      "Evolução teste",
		"conteudo":    "Conteúdo clínico de teste.",
	}
	resP := postJSON(t, r, "POST", "/clinicas/prontuarios", bodyPront, auth)
	if resP.Code != http.StatusCreated {
		t.Fatalf("criar prontuário: esperado 201, obteve %d: %s", resP.Code, resP.Body.String())
	}
	var criado models.ProntuarioRegistro
	if err := json.Unmarshal(resP.Body.Bytes(), &criado); err != nil {
		t.Fatalf("decodificar prontuário criado: %v", err)
	}
	if criado.ID == 0 {
		t.Fatal("prontuário sem ID na resposta")
	}
	t.Cleanup(func() {
		db.Unscoped().Where("id = ?", criado.ID).Delete(&models.ProntuarioRegistro{})
	})
	t.Cleanup(func() {
		db.Where("clinica_id = ? AND usuario_id = ?", clinica.ID, medico.ID).Delete(&models.Agenda{})
	})

	// Simula que já se passaram 25 horas desde a criação (sem mock de relógio na aplicação).
	past := time.Now().Add(-25 * time.Hour)
	if err := db.Exec(
		"UPDATE prontuario_registros SET created_at = ? WHERE id = ? AND clinica_id = ?",
		past, criado.ID, clinica.ID,
	).Error; err != nil {
		t.Fatalf("ajustar created_at para teste: %v", err)
	}

	bodyEdit := map[string]any{
		"titulo":   "Título alterado",
		"conteudo": "Tentativa após 25h.",
	}
	path := fmt.Sprintf("/clinicas/prontuarios/%d", criado.ID)
	resE := postJSON(t, r, "PUT", path, bodyEdit, auth)
	if resE.Code != http.StatusConflict {
		t.Fatalf("edição após prazo: esperado 409 (imutável), obteve %d: %s", resE.Code, resE.Body.String())
	}
}

func login(t *testing.T, r http.Handler, email, senha string) string {
	t.Helper()
	body := map[string]string{"email": email, "senha": senha}
	w := postJSON(t, r, "POST", "/login", body, "")
	if w.Code != http.StatusOK {
		t.Fatalf("login: esperado 200, obteve %d: %s", w.Code, w.Body.String())
	}
	var out struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("decodificar login: %v", err)
	}
	if out.Token == "" {
		t.Fatal("token vazio")
	}
	return out.Token
}

func postJSON(t *testing.T, r http.Handler, method, path string, body any, authorization string) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode json: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if authorization != "" {
		req.Header.Set("Authorization", authorization)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// proximoHorarioAgendavel retorna o próximo instante (daqui a 2 dias) às 10:00 no fuso local,
// evitando fins de semana para coincidir com horário de trabalho do teste (seg–sex).
func proximoHorarioAgendavel(t *testing.T) time.Time {
	t.Helper()
	loc := time.Local
	d := time.Now().In(loc).Add(48 * time.Hour)
	for int(d.Weekday()) == 0 || int(d.Weekday()) == 6 {
		d = d.Add(24 * time.Hour)
	}
	return time.Date(d.Year(), d.Month(), d.Day(), 10, 0, 0, 0, loc)
}

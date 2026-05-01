package database

import (
	"errors"
	"log"
	"os"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func RunMigrations(db *gorm.DB) {
	err := db.AutoMigrate(
		// Sem dependências
		&models.Clinica{},
		&models.Funcionalidade{},
		&models.StatusAgendamento{},
		&models.TokenRedifinicao{},
		// Dependem de Clinica
		&models.TipoUsuario{},
		&models.Plano{},
		&models.Tela{},
		// Dependem de TipoUsuario / Clinica
		&models.Usuario{},
		&models.UsuarioClinica{},
		&models.Permissao{},
		&models.Assinatura{},
		&models.PlanoTela{},
		// Dependem de Clinica / Usuario
		&models.Paciente{},
		&models.Procedimento{},
		&models.Convenio{},
		&models.ClinicaConfiguracao{},
		&models.LancamentoFinanceiro{},
		&models.CustoFixo{},
		&models.UsuarioHorario{},
		&models.PermissaoTela{},
		&models.AuditLog{},
		// Dependem de Paciente / Procedimento / Convenio
		&models.ConvenioProcedimento{},
		&models.Agenda{},
		&models.AgendaProcedimento{},
		&models.ProntuarioRegistro{},
		&models.CobrancaConsulta{},
	)

	if err != nil {
		log.Fatal("Erro ao rodar as migrations: ", err)
	}

	log.Println("Migrations executadas com sucesso.")

	seedStatusAgendamentos(db)
	ensureStatusEmAtendimento(db)
	// Criar dados iniciais
	createInitialData(db)
	syncDocumentoClinicaLegado(db)
	seedUsuarioClinicasLegacy(db)
	ensureTiposProfissionaisClinicas(db)
	seedCatalogoTelas(db)
	ensureCobrancaPermissoes(db)
	ensurePermissoesPadraoMedicoSecretaria(db)
	ensureConvenioPermissaoSecretaria(db)
	ensureCustosFixosPermissoes(db)
	ensureRotulosTelasMenu(db)
	ensureTelaEquipeParaPerfisComModuloEquipe(db)
	ensureTelaAtendimentosParaMedicosComAgenda(db)
}

// ensureRotulosTelasMenu atualiza nomes/descrições em bases já seedadas (seed só insere se rota não existir).
func ensureRotulosTelasMenu(db *gorm.DB) {
	updates := []struct {
		rota  string
		nome  string
		desc  string
	}{
		{"/convenios", "Convênios (menu)", "Planos, convênios e vínculos com procedimentos — API /convenios"},
	}
	for _, u := range updates {
		if err := db.Model(&models.Tela{}).Where("rota = ?", u.rota).Updates(map[string]interface{}{
			"nome": u.nome, "descricao": u.desc,
		}).Error; err != nil {
			log.Printf("ensureRotulosTelasMenu %s: %v", u.rota, err)
		}
	}
}

// ensureTelaEquipeParaPerfisComModuloEquipe concede a tela /clinicas/equipe a tipos que já tinham alguma permissão do módulo equipe.
func ensureTelaEquipeParaPerfisComModuloEquipe(db *gorm.DB) {
	equipeTid := telaIDByRota(db, "/clinicas/equipe")
	if equipeTid == 0 {
		return
	}
	rotasLegado := []string{
		"/usuarios", "/usuarios/:id", "/usuarios/:id/reativar", "/usuarios/:id/horarios",
		"/clinicas/tipos-usuario", "/clinicas/usuarios",
	}
	var tipoIDs []uint
	for _, r := range rotasLegado {
		tid := telaIDByRota(db, r)
		if tid == 0 {
			continue
		}
		var ids []uint
		if err := db.Model(&models.PermissaoTela{}).Where("tela_id = ?", tid).Distinct("tipo_usuario_id").Pluck("tipo_usuario_id", &ids); err != nil {
			continue
		}
		tipoIDs = append(tipoIDs, ids...)
	}
	seen := make(map[uint]struct{})
	for _, id := range tipoIDs {
		if id == 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		grantPermIfMissing(db, id, equipeTid)
	}
}

// ensureTelaAtendimentosParaMedicosComAgenda concede /clinicas/atendimentos apenas a perfis com papel Médico que já tenham agenda.
func ensureTelaAtendimentosParaMedicosComAgenda(db *gorm.DB) {
	atendTid := telaIDByRota(db, "/clinicas/atendimentos")
	agendaTid := telaIDByRota(db, "/clinicas/agenda")
	if atendTid == 0 || agendaTid == 0 {
		return
	}
	var tipoIDs []uint
	if err := db.Model(&models.PermissaoTela{}).Where("tela_id = ?", agendaTid).Distinct("tipo_usuario_id").Pluck("tipo_usuario_id", &tipoIDs); err != nil {
		log.Printf("ensureTelaAtendimentosParaMedicosComAgenda: %v", err)
		return
	}
	for _, typeID := range tipoIDs {
		if typeID == 0 {
			continue
		}
		var tu models.TipoUsuario
		if err := db.First(&tu, typeID).Error; err != nil {
			continue
		}
		if tu.Papel != rbac.PapelMedico {
			continue
		}
		grantPermIfMissing(db, typeID, atendTid)
	}
}

// syncDocumentoClinicaLegado preenche clinicas.documento a partir do cnpj em bases antigas.
func syncDocumentoClinicaLegado(db *gorm.DB) {
	var clinicas []models.Clinica
	if err := db.Find(&clinicas).Error; err != nil {
		log.Printf("syncDocumentoClinicaLegado: listar clínicas: %v", err)
		return
	}
	for _, c := range clinicas {
		if strings.TrimSpace(c.Documento) != "" {
			continue
		}
		doc := strings.TrimSpace(c.CNPJ)
		if doc == "" {
			continue
		}
		if err := db.Model(&models.Clinica{}).Where("id = ?", c.ID).Update("documento", doc).Error; err != nil {
			log.Printf("syncDocumentoClinicaLegado clínica %d: %v", c.ID, err)
		}
	}
}

func seedStatusAgendamentos(db *gorm.DB) {
	nomes := []string{"Agendado", "Confirmado", "Em atendimento", "Realizado", "Cancelado", "Falta"}
	for _, nome := range nomes {
		var s models.StatusAgendamento
		key := strings.ToLower(strings.TrimSpace(nome))
		err := db.Where("LOWER(TRIM(nome)) = ?", key).First(&s).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := db.Create(&models.StatusAgendamento{Nome: nome}).Error; err != nil {
				log.Printf("seedStatusAgendamentos %s: %v", nome, err)
			} else {
				log.Printf("Status de agendamento criado: %s", nome)
			}
		}
	}
}

// ensureStatusEmAtendimento garante o status canônico "Em atendimento" (corrige grafia antiga).
func ensureStatusEmAtendimento(db *gorm.DB) {
	var s models.StatusAgendamento
	err := db.Where("LOWER(TRIM(nome)) = ?", "em atendimento").First(&s).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if err := db.Create(&models.StatusAgendamento{Nome: "Em atendimento"}).Error; err != nil {
			log.Printf("ensureStatusEmAtendimento: %v", err)
		}
		return
	}
	if strings.TrimSpace(s.Nome) != "Em atendimento" {
		if err := db.Model(&s).Update("nome", "Em atendimento").Error; err != nil {
			log.Printf("ensureStatusEmAtendimento rename: %v", err)
		}
	}
}

// aplicarPoliticaRetencaoAuditLogs minimiza logs de acesso sensível com mais de 5 anos.
func aplicarPoliticaRetencaoAuditLogs(db *gorm.DB) {
	cutoff := time.Now().AddDate(-5, 0, 0)
	res := db.Model(&models.AuditLog{}).
		Where("created_at < ?", cutoff).
		Updates(map[string]interface{}{
			"usuario_id": 0,
			"paciente_id": nil,
			"clinica_id": 0,
			"ip":        "",
			"detalhes":  "LOG ANONIMIZADO POR POLÍTICA DE RETENÇÃO",
		})
	if res.Error != nil {
		log.Printf("aplicarPoliticaRetencaoAuditLogs: %v", res.Error)
		return
	}
	if res.RowsAffected > 0 {
		log.Printf("aplicarPoliticaRetencaoAuditLogs: %d logs anonimizados (cutoff=%s)", res.RowsAffected, cutoff.Format("2006-01-02"))
	}
}

func createInitialData(db *gorm.DB) {
	// Criar clínica padrão
	var clinica models.Clinica
	if err := db.Where("cnpj = ?", "00.000.000/0001-00").First(&clinica).Error; err != nil {
		clinica = models.Clinica{
			Nome:             "Clínica Admin",
			Documento:        "00000000000100",
			CNPJ:             "00.000.000/0001-00",
			EmailResponsavel: "admin@clinica.com",
			NomeResponsavel:  "Administrador",
			Telefone:         "",
			Endereco:         "",
			Capacidade:       100,
			Ativa:            true,
		}
		db.Create(&clinica)
		log.Println("Clínica admin criada")
	}

	// Criar tipo usuário admin
	var tipoAdmin models.TipoUsuario
	if err := db.Where("nome = ? AND clinica_id = ?", "Administrador", clinica.ID).First(&tipoAdmin).Error; err != nil {
		tipoAdmin = models.TipoUsuario{
			Nome:      "Administrador",
			Descricao: "Administrador do sistema",
			Papel:     rbac.PapelADMGeral,
			ClinicaID: clinica.ID,
		}
		db.Create(&tipoAdmin)
		log.Println("Tipo usuário admin criado")
	}
	_ = db.Model(&models.TipoUsuario{}).Where("nome = ? AND clinica_id = ?", "Administrador", clinica.ID).Update("papel", rbac.PapelADMGeral)

	// Criar usuário admin
	adminEmail := os.Getenv("ADMIN_EMAIL")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	if adminEmail == "" {
		adminEmail = "admin@admin.com"
	}
	if adminPassword == "" {
		adminPassword = "admin123"
	}

	var admin models.Usuario
	if err := db.Where("email = ?", adminEmail).First(&admin).Error; err != nil {
		senhaHash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
		admin = models.Usuario{
			Nome:          "Administrador",
			Email:         adminEmail,
			Senha:         string(senhaHash),
			Ativo:         true,
			ClinicaID:     clinica.ID,
			TipoUsuarioID: tipoAdmin.ID,
		}
		db.Create(&admin)
		log.Printf("Usuário admin criado - Email: %s | Senha: %s", adminEmail, adminPassword)
	}
}

// seedUsuarioClinicasLegacy cria vínculos usuario_clinicas a partir de usuarios.clinica_id (dados anteriores à tabela de associação).
func seedUsuarioClinicasLegacy(db *gorm.DB) {
	var usuarios []models.Usuario
	if err := db.Find(&usuarios).Error; err != nil {
		log.Printf("seedUsuarioClinicasLegacy: listar usuários: %v", err)
		return
	}
	for _, u := range usuarios {
		if u.ClinicaID == 0 {
			continue
		}
		var n int64
		db.Model(&models.UsuarioClinica{}).
			Where("usuario_id = ? AND clinica_id = ?", u.ID, u.ClinicaID).
			Count(&n)
		if n > 0 {
			continue
		}
		uc := models.UsuarioClinica{
			UsuarioID:     u.ID,
			ClinicaID:     u.ClinicaID,
			TipoUsuarioID: u.TipoUsuarioID,
			Ativo:         true,
		}
		if err := db.Create(&uc).Error; err != nil {
			log.Printf("seedUsuarioClinicasLegacy usuário %d: %v", u.ID, err)
		}
	}
}

// ensureTiposProfissionaisClinicas cria "Médico" e "Secretária" por clínica quando ainda não existem
// (clínicas antigas ou criadas antes dessa lógica).
func ensureTiposProfissionaisClinicas(db *gorm.DB) {
	var clinicas []models.Clinica
	if err := db.Find(&clinicas).Error; err != nil {
		log.Printf("ensureTiposProfissionaisClinicas: listar clínicas: %v", err)
		return
	}
	for _, c := range clinicas {
		ensureTiposForClinicaID(db, c.ID)
	}
}

func ensureTiposForClinicaID(db *gorm.DB, clinicaID uint) {
	seeds := []struct {
		nome, desc, papel string
	}{
		{"Médico", "Atendimento e prontuário", rbac.PapelMedico},
		{"Secretária", "Recepção e agendamento", rbac.PapelSecretaria},
	}
	for _, s := range seeds {
		var n int64
		db.Model(&models.TipoUsuario{}).Where("clinica_id = ? AND nome = ?", clinicaID, s.nome).Count(&n)
		if n > 0 {
			continue
		}
		tu := models.TipoUsuario{Nome: s.nome, Descricao: s.desc, Papel: s.papel, ClinicaID: clinicaID}
		if err := db.Create(&tu).Error; err != nil {
			log.Printf("seed tipo %q clínica %d: %v", s.nome, clinicaID, err)
		}
	}
}

// seedCatalogoTelas cadastra rotas da API (Gin FullPath) para gestão de permissões e UI de perfis.
func seedCatalogoTelas(db *gorm.DB) {
	catalogo := []models.Tela{
		{Nome: "Dashboard", Rota: "/dashboard", Descricao: "Resumo principal", Ativo: true},
		{Nome: "Agendamentos hoje", Rota: "/dashboard/agendamentos-hoje", Descricao: "Lista do dia", Ativo: true},
		{Nome: "Estatísticas", Rota: "/dashboard/estatisticas", Descricao: "Indicadores", Ativo: true},
		{Nome: "Métricas operacionais", Rota: "/dashboard/metricas-operacionais", Descricao: "Métricas", Ativo: true},
		{Nome: "Pacientes (lista)", Rota: "/pacientes", Descricao: "CRUD pacientes", Ativo: true},
		{Nome: "Paciente por CPF", Rota: "/pacientes/:cpf", Descricao: "Busca por CPF", Ativo: true},
		{Nome: "Paciente por ID", Rota: "/pacientes/:id", Descricao: "Atualização / desativação", Ativo: true},
		{Nome: "Reativar paciente", Rota: "/pacientes/:id/reativar", Descricao: "Reativa cadastro", Ativo: true},
		{Nome: "Equipe da clínica (menu)", Rota: "/clinicas/equipe", Descricao: "Usuários, horários e tipos (/usuarios, /clinicas/tipos-usuario, /clinicas/usuarios)", Ativo: true},
		{Nome: "Usuários da clínica", Rota: "/usuarios", Descricao: "Lista e cadastro global", Ativo: true},
		{Nome: "Usuário por ID", Rota: "/usuarios/:id", Descricao: "Detalhe usuário", Ativo: true},
		{Nome: "Reativar usuário", Rota: "/usuarios/:id/reativar", Descricao: "Reativa cadastro", Ativo: true},
		{Nome: "Horários do usuário", Rota: "/usuarios/:id/horarios", Descricao: "Grade de atendimento", Ativo: true},
		{Nome: "Meus atendimentos (menu)", Rota: "/clinicas/atendimentos", Descricao: "Fluxo do dia e status na agenda (libera as rotas /clinicas/agenda na API)", Ativo: true},
		{Nome: "Agenda (lista/criar)", Rota: "/clinicas/agenda", Descricao: "Agendamentos da clínica", Ativo: true},
		{Nome: "Status do agendamento", Rota: "/clinicas/agenda/:id/status", Descricao: "Confirmar / falta", Ativo: true},
		{Nome: "Horários disponíveis", Rota: "/clinicas/agenda/horarios-disponiveis", Descricao: "Slots livres", Ativo: true},
		{Nome: "Prontuários", Rota: "/clinicas/prontuarios", Descricao: "Listar e registrar", Ativo: true},
		{Nome: "Prontuário por ID", Rota: "/clinicas/prontuarios/:id", Descricao: "Atualizar registro", Ativo: true},
		{Nome: "Procedimentos", Rota: "/procedimentos", Descricao: "Catálogo de procedimentos", Ativo: true},
		{Nome: "Convênios (menu)", Rota: "/convenios", Descricao: "Planos, convênios e vínculos com procedimentos — mesma rota da API /convenios", Ativo: true},
		{Nome: "Financeiro (abrir)", Rota: "/financeiro/abrir", Descricao: "Abertura do módulo financeiro", Ativo: true},
		{Nome: "Lançamentos financeiros", Rota: "/clinicas/financeiro", Descricao: "Lista e novo lançamento", Ativo: true},
		{Nome: "Resumo financeiro", Rota: "/clinicas/financeiro/resumo", Descricao: "Totais do período", Ativo: true},
		{Nome: "Custos fixos (lista/criar)", Rota: "/clinicas/custos-fixos", Descricao: "Despesas fixas mensais", Ativo: true},
		{Nome: "Custos fixos (editar)", Rota: "/clinicas/custos-fixos/:id", Descricao: "Atualizar custo fixo", Ativo: true},
		{Nome: "Tipos de usuário (clínica)", Rota: "/clinicas/tipos-usuario", Descricao: "Equipe / cadastro de usuários", Ativo: true},
		{Nome: "Usuários (clínica)", Rota: "/clinicas/usuarios", Descricao: "Criar usuário na clínica", Ativo: true},
		{Nome: "Gestão — catálogo de telas", Rota: "/clinicas/gestao/telas", Descricao: "Perfis e permissões", Ativo: true},
		{Nome: "Gestão — tipos de usuário", Rota: "/clinicas/gestao/tipos-usuario", Descricao: "CRUD de perfis", Ativo: true},
		{Nome: "Gestão — permissões", Rota: "/clinicas/gestao/permissoes-tela", Descricao: "Associar telas ao perfil", Ativo: true},
		{Nome: "Pagamentos — fila", Rota: "/clinicas/cobrancas/fila", Descricao: "Consultas liberadas para cobrança", Ativo: true},
		{Nome: "Pagamentos — criar cobrança", Rota: "/clinicas/cobrancas", Descricao: "Pix/cartão (Asaas), dinheiro ou confirmação na recepção", Ativo: true},
		{Nome: "Pagamentos — detalhe", Rota: "/clinicas/cobrancas/:id", Descricao: "Detalhe da cobrança", Ativo: true},
		{Nome: "Pagamentos — relatório financeiro", Rota: "/clinicas/cobrancas/relatorio-financeiro", Descricao: "Recebimentos líquidos (dono)", Ativo: true},
		{Nome: "Agenda — liberar cobrança", Rota: "/clinicas/agenda/:id/liberar-cobranca", Descricao: "Médico libera para secretaria", Ativo: true},
	}
	for _, t := range catalogo {
		var n int64
		db.Model(&models.Tela{}).Where("rota = ?", t.Rota).Count(&n)
		if n > 0 {
			continue
		}
		if err := db.Create(&t).Error; err != nil {
			log.Printf("seedCatalogoTelas %s: %v", t.Rota, err)
		}
	}
}

// ensureCobrancaPermissoes concede telas de pagamento a perfis existentes (idempotente).
func ensureCobrancaPermissoes(db *gorm.DB) {
	extras := []struct {
		papel string
		rotas []string
	}{
		{rbac.PapelSecretaria, []string{
			"/clinicas/cobrancas/fila", "/clinicas/cobrancas", "/clinicas/cobrancas/:id",
		}},
		{rbac.PapelMedico, []string{
			"/clinicas/agenda/:id/liberar-cobranca",
		}},
		{rbac.PapelDono, []string{
			"/clinicas/cobrancas/fila", "/clinicas/cobrancas", "/clinicas/cobrancas/:id",
			"/clinicas/cobrancas/relatorio-financeiro", "/clinicas/agenda/:id/liberar-cobranca",
		}},
	}
	for _, e := range extras {
		var tipos []models.TipoUsuario
		if err := db.Where("papel = ?", e.papel).Find(&tipos).Error; err != nil {
			log.Printf("ensureCobrancaPermissoes listar tipos %s: %v", e.papel, err)
			continue
		}
		for _, tu := range tipos {
			for _, rota := range e.rotas {
				grantPermIfMissing(db, tu.ID, telaIDByRota(db, rota))
			}
		}
	}
}

func grantPermIfMissing(db *gorm.DB, tipoUsuarioID, telaID uint) {
	if telaID == 0 {
		return
	}
	var c int64
	db.Model(&models.PermissaoTela{}).Where("tipo_usuario_id = ? AND tela_id = ?", tipoUsuarioID, telaID).Count(&c)
	if c > 0 {
		return
	}
	p := models.PermissaoTela{TipoUsuarioID: tipoUsuarioID, TelaID: telaID}
	if err := db.Create(&p).Error; err != nil {
		log.Printf("grantPerm tipo=%d tela=%d: %v", tipoUsuarioID, telaID, err)
	}
}

func telaIDByRota(db *gorm.DB, rota string) uint {
	var t models.Tela
	if err := db.Where("rota = ? AND ativo = ?", rota, true).First(&t).Error; err != nil {
		return 0
	}
	return t.ID
}

// ensurePermissoesPadraoMedicoSecretaria concede telas básicas quando o perfil ainda não tem nenhuma permissão.
func ensurePermissoesPadraoMedicoSecretaria(db *gorm.DB) {
	rotasMedicoCore := []string{
		"/dashboard", "/dashboard/agendamentos-hoje", "/dashboard/estatisticas", "/dashboard/metricas-operacionais",
		"/pacientes", "/pacientes/:cpf", "/pacientes/:id",
		"/clinicas/agenda", "/clinicas/agenda/:id/status", "/clinicas/agenda/horarios-disponiveis",
		"/clinicas/prontuarios", "/clinicas/prontuarios/:id",
		"/procedimentos",
	}
	rotasMedico := append(append([]string{}, rotasMedicoCore...), "/clinicas/atendimentos")
	rotasSecretaria := append([]string{
		"/clinicas/equipe",
		"/usuarios", "/usuarios/:id", "/usuarios/:id/horarios",
		"/clinicas/tipos-usuario", "/clinicas/usuarios",
		"/clinicas/financeiro", "/clinicas/financeiro/resumo", "/financeiro/abrir",
		"/convenios",
	}, rotasMedicoCore...)

	var tipos []models.TipoUsuario
	if err := db.Where("nome IN ?", []string{"Médico", "Secretária"}).Find(&tipos).Error; err != nil {
		log.Printf("ensurePermissoesPadrao: listar tipos: %v", err)
		return
	}
	for _, tu := range tipos {
		var n int64
		db.Model(&models.PermissaoTela{}).Where("tipo_usuario_id = ?", tu.ID).Count(&n)
		if n > 0 {
			continue
		}
		var rotas []string
		switch tu.Nome {
		case "Médico":
			rotas = rotasMedico
		case "Secretária":
			rotas = rotasSecretaria
		default:
			continue
		}
		for _, r := range rotas {
			tid := telaIDByRota(db, r)
			grantPermIfMissing(db, tu.ID, tid)
		}
		log.Printf("Permissões padrão criadas para tipo %q (clínica %d)", tu.Nome, tu.ClinicaID)
	}
}

// ensureConvenioPermissaoSecretaria concede a tela /convenios a perfis Secretária que ainda não a tenham (clínicas antigas).
func ensureConvenioPermissaoSecretaria(db *gorm.DB) {
	tid := telaIDByRota(db, "/convenios")
	if tid == 0 {
		return
	}
	var tipos []models.TipoUsuario
	if err := db.Where("nome = ?", "Secretária").Find(&tipos).Error; err != nil {
		log.Printf("ensureConvenioPermissaoSecretaria: %v", err)
		return
	}
	for _, tu := range tipos {
		grantPermIfMissing(db, tu.ID, tid)
	}
}

// ensureCustosFixosPermissoes replica permissão de /clinicas/financeiro para as rotas de custos fixos (clínicas antigas).
func ensureCustosFixosPermissoes(db *gorm.DB) {
	finTid := telaIDByRota(db, "/clinicas/financeiro")
	if finTid == 0 {
		return
	}
	var tipoIDs []uint
	if err := db.Model(&models.PermissaoTela{}).
		Where("tela_id = ?", finTid).
		Distinct("tipo_usuario_id").
		Pluck("tipo_usuario_id", &tipoIDs); err != nil {
		log.Printf("ensureCustosFixosPermissoes: %v", err)
		return
	}
	for _, rota := range []string{"/clinicas/custos-fixos", "/clinicas/custos-fixos/:id"} {
		tid := telaIDByRota(db, rota)
		if tid == 0 {
			continue
		}
		for _, typeID := range tipoIDs {
			grantPermIfMissing(db, typeID, tid)
		}
	}
}

package controllers

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/models/DTO"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/API/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

type ClinicaController struct {
	service            services.ClinicaService
	configService      services.ConfiguracaoService
	usuarioService     services.UsuarioService
	tipoUsuarioRepo    repositories.TipoUsuarioRepository
	assinaturaService  services.AssinaturaService
}

func NovaClinicaController(s services.ClinicaService, configService services.ConfiguracaoService, usuarioService services.UsuarioService, tipoUsuarioRepo repositories.TipoUsuarioRepository, assinaturaService services.AssinaturaService) *ClinicaController {
	return &ClinicaController{
		service:           s,
		configService:     configService,
		usuarioService:    usuarioService,
		tipoUsuarioRepo:   tipoUsuarioRepo,
		assinaturaService: assinaturaService,
	}
}

// @Summary Criar clínica
// @Description Cria uma nova clínica
// @Tags Clínicas
// @Accept json
// @Produce json
// @Param clinica body ClinicaRequest true "Dados da clínica"
// @Success 201 {object} ClinicaResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /clinicas [post]
func (cc *ClinicaController) Criar(c *gin.Context) {
	var clinicaDTO DTO.CriarClinicaDTO
	if err := c.ShouldBindJSON(&clinicaDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}

	clinica := servicedto.CriarClinicaDTO_CriarClinica(clinicaDTO)

	if err := cc.service.CadastrarClinica(&clinica); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	// Criar tipo usuário admin para a clínica (DONO: RBAC + JWT com papel)
	tipoUsuario := models.TipoUsuario{
		Nome:      "Administrador",
		Descricao: "Administrador da clínica",
		ClinicaID: clinica.ID,
		Papel:     rbac.PapelDono,
	}
	if err := cc.tipoUsuarioRepo.CriarTipoUsuario(&tipoUsuario); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao criar tipo usuário"})
		return
	}

	// Tipos para equipe (clínica pequena: dono agenda em si; demais papéis para novos usuários)
	for _, p := range []struct {
		nome, desc, papel string
	}{
		{"Médico", "Atendimento e prontuário", rbac.PapelMedico},
		{"Secretária", "Recepção e agendamento", rbac.PapelSecretaria},
	} {
		tu := models.TipoUsuario{Nome: p.nome, Descricao: p.desc, Papel: p.papel, ClinicaID: clinica.ID}
		if err := cc.tipoUsuarioRepo.CriarTipoUsuario(&tu); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao criar tipo de usuário: " + p.nome})
			return
		}
	}

	// Criar usuário dono (senha em texto baseada no documento; CriarUsuario aplica HashSenha uma vez)
	adminPassword := regexp.MustCompile(`\D`).ReplaceAllString(clinica.Documento, "")
	if adminPassword == "" {
		adminPassword = regexp.MustCompile(`\D`).ReplaceAllString(clinica.CNPJ, "")
	}
	if adminPassword == "" {
		adminPassword = "123456"
	}
	adminEmail := clinica.EmailResponsavel
	nomeDono := strings.TrimSpace(clinica.NomeResponsavel)
	if nomeDono == "" {
		nomeDono = "Administrador"
	}
	usuario := models.Usuario{
		Nome:          nomeDono,
		Email:         adminEmail,
		Senha:         adminPassword,
		Ativo:         true,
		ClinicaID:     clinica.ID,
		TipoUsuarioID: tipoUsuario.ID,
	}
	if err := cc.usuarioService.CriarUsuario(&usuario, clinica.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao criar usuário admin"})
		return
	}

	dataInicio := time.Now()
	if s := strings.TrimSpace(clinicaDTO.DataInicio); s != "" {
		if t, err := time.ParseInLocation("2006-01-02", s, time.Local); err == nil {
			dataInicio = t
		}
	}
	assinatura := models.Assinatura{
		ClinicaID:  clinica.ID,
		PlanoID:    clinicaDTO.PlanoID,
		DataInicio: dataInicio,
		Ativa:      true,
	}
	if exp, err := calcularDataExpiracaoAssinatura(dataInicio, clinicaDTO.PeriodoAssinatura, clinicaDTO.PeriodoMeses, clinicaDTO.DataFim); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	} else {
		assinatura.DataExpiracao = exp
	}
	if err := cc.assinaturaService.Criar(&assinatura); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": "Clínica e usuário criados, mas falhou ao vincular o plano: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"clinica": clinica, "usuario_dono": gin.H{"nome": nomeDono, "email": adminEmail, "senha": adminPassword}})
}

func calcularDataExpiracaoAssinatura(dataInicio time.Time, periodo string, periodoMeses *int, dataFim *string) (*time.Time, error) {
	p := strings.ToUpper(strings.TrimSpace(periodo))
	switch p {
	case "", "ANUAL":
		t := dataInicio.AddDate(1, 0, 0)
		return &t, nil
	case "SEMESTRAL":
		t := dataInicio.AddDate(0, 6, 0)
		return &t, nil
	case "DEFINIDO":
		if dataFim != nil && strings.TrimSpace(*dataFim) != "" {
			df, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(*dataFim), time.Local)
			if err != nil {
				return nil, fmt.Errorf("data_fim inválida; use YYYY-MM-DD")
			}
			if !df.After(dataInicio) {
				return nil, fmt.Errorf("data_fim deve ser maior que data_inicio")
			}
			return &df, nil
		}
		meses := 0
		if periodoMeses != nil {
			meses = *periodoMeses
		}
		if meses <= 0 {
			return nil, fmt.Errorf("periodo_meses deve ser maior que zero para período definido")
		}
		t := dataInicio.AddDate(0, meses, 0)
		return &t, nil
	default:
		return nil, fmt.Errorf("periodo_assinatura inválido. Use ANUAL, SEMESTRAL ou DEFINIDO")
	}
}

// @Summary Listar clínicas
// @Description Lista todas as clínicas
// @Tags Clínicas
// @Accept json
// @Produce json
// @Param ativas query boolean false "Filtrar apenas clínicas ativas"
// @Success 200 {array} ClinicaResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /clinicas [get]
func (cc *ClinicaController) Listar(c *gin.Context) {
	var filtro *bool
	if param := c.Query("ativas"); param != "" {
		val := param == "true"
		filtro = &val
	}

	clinicas, err := cc.service.ListarClinicas(filtro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"clinicas": clinicas})
}

func (cc *ClinicaController) Buscar(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	clinica, err := cc.service.BuscarPorID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "Clínica não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"clinica": clinica})
}

func (cc *ClinicaController) Atualizar(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID da clínica inválido"})
		return
	}

	existing, err := cc.service.BuscarPorID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "Clínica não encontrada"})
		return
	}

	var incoming models.Clinica
	if err := c.ShouldBindJSON(&incoming); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}

	if strings.TrimSpace(incoming.Nome) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "nome é obrigatório"})
		return
	}

	existing.Nome = strings.TrimSpace(incoming.Nome)
	existing.Documento = strings.TrimSpace(incoming.Documento)
	existing.CNPJ = strings.TrimSpace(incoming.CNPJ)
	if existing.CNPJ == "" && len(existing.Documento) == 14 {
		existing.CNPJ = existing.Documento
	}
	existing.EmailResponsavel = strings.TrimSpace(incoming.EmailResponsavel)
	existing.NomeResponsavel = strings.TrimSpace(incoming.NomeResponsavel)
	existing.Telefone = strings.TrimSpace(incoming.Telefone)
	existing.Endereco = strings.TrimSpace(incoming.Endereco)
	if incoming.Capacidade > 0 {
		existing.Capacidade = incoming.Capacidade
	}
	existing.Ativa = incoming.Ativa

	usuarioClinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}

	tipoUsuarioID, err := middleware.ExtrairDoToken[uint](c, "tipo_usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}

	papel, _ := middleware.ExtrairDoToken[string](c, "papel")

	if err := cc.service.AtualizarClinica(existing, usuarioClinicaID, tipoUsuarioID, papel); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"clinica": existing})
}

func (cc *ClinicaController) Desativar(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := cc.service.DesativarClinica(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mensagem": "Clínica desativada com sucesso"})
}

func (cc *ClinicaController) Reativar(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := cc.service.ReativarClinica(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mensagem": "Clínica reativada com sucesso"})
}

// @Summary Buscar configurações da clínica
// @Description Retorna as configurações da clínica
// @Tags Clínicas
// @Accept json
// @Produce json
// @Param id path int true "ID da clínica"
// @Success 200 {object} ConfiguracaoResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /clinicas/{id}/configuracoes [get]
func (cc *ClinicaController) BuscarConfiguracoes(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// Verificar se usuário tem acesso à clínica
	usuarioClinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}

	if usuarioClinicaID != uint(id) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Acesso negado"})
		return
	}

	config, err := cc.configService.BuscarConfiguracao(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

// @Summary Atualizar configurações da clínica
// @Description Atualiza as configurações da clínica
// @Tags Clínicas
// @Accept json
// @Produce json
// @Param id path int true "ID da clínica"
// @Param configuracao body ConfiguracaoRequest true "Dados da configuração"
// @Success 200 {object} ConfiguracaoResponse
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Security BearerAuth
// @Router /clinicas/{id}/configuracoes [put]
func (cc *ClinicaController) AtualizarConfiguracoes(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// Verificar se usuário tem acesso à clínica
	usuarioClinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}

	if usuarioClinicaID != uint(id) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Acesso negado"})
		return
	}

	var req dto.ConfiguracaoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}

	config, err := cc.configService.AtualizarConfiguracao(uint(id), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

// BuscarConfiguracoesAdmin retorna configurações de qualquer clínica (apenas administrador da plataforma).
func (cc *ClinicaController) BuscarConfiguracoesAdmin(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID da clínica inválido"})
		return
	}
	config, err := cc.configService.BuscarConfiguracao(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, config)
}

// AtualizarConfiguracoesAdmin atualiza configurações de qualquer clínica (apenas administrador da plataforma).
func (cc *ClinicaController) AtualizarConfiguracoesAdmin(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "ID da clínica inválido"})
		return
	}
	var req dto.ConfiguracaoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}
	config, err := cc.configService.AtualizarConfiguracao(uint(id), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, config)
}

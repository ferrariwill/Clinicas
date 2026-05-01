package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/internal/retention"
	"github.com/ferrariwill/Clinicas/API/models"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/API/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/repositories"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/ferrariwill/Clinicas/API/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminController struct {
	PlanoService      services.PlanoService
	TelaService       services.TelaService
	PlanoTelaService  services.PlanoTelaService
	AssinaturaService services.AssinaturaService
	UsuarioService    services.UsuarioService
	AuditLogRepo      repositories.AuditLogRepository
	DB                *gorm.DB
}

func NovoAdminController(planoService services.PlanoService,
	telaService services.TelaService,
	planoTelaService services.PlanoTelaService,
	assinaturaService services.AssinaturaService,
	usuarioService services.UsuarioService,
	auditLogRepo repositories.AuditLogRepository,
	db *gorm.DB,
) AdminController {
	return AdminController{
		PlanoService:      planoService,
		TelaService:       telaService,
		PlanoTelaService:  planoTelaService,
		AssinaturaService: assinaturaService,
		UsuarioService:    usuarioService,
		AuditLogRepo:      auditLogRepo,
		DB:                db,
	}
}

// ListarAuditLogs retorna a trilha administrativa para responder "quem acessou o prontuário".
// Filtros opcionais: usuario_id e paciente_id.
func (ac AdminController) ListarAuditLogs(c *gin.Context) {
	var usuarioID *uint
	if s := c.Query("usuario_id"); s != "" {
		v, err := utils.StringParaUint(s)
		if err != nil || v == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "usuario_id inválido"})
			return
		}
		usuarioID = &v
	}
	var pacienteID *uint
	if s := c.Query("paciente_id"); s != "" {
		v, err := utils.StringParaUint(s)
		if err != nil || v == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "paciente_id inválido"})
			return
		}
		pacienteID = &v
	}
	logs, err := ac.AuditLogRepo.ListarFiltrado(usuarioID, pacienteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao consultar trilha de auditoria"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

// RunRetention dispara manualmente a política de retenção de dados.
func (ac AdminController) RunRetention(c *gin.Context) {
	if ac.DB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Worker de retenção indisponível"})
		return
	}
	report, err := retention.RunNow(ac.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao executar retenção"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Retenção executada com sucesso",
		"report":  report,
	})
}

/*Assinaturas*/

// @Summary Criar assinatura
// @Description Cria uma nova assinatura
// @Tags Admin
// @Accept json
// @Produce json
// @Param assinatura body map[string]interface{} true "Dados da assinatura"
// @Success 201 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/assinaturas [post]
func (ac AdminController) CriarAssinatura(c *gin.Context) {
	var assinaturaDto dto.CriarAssinaturaDTO
	if err := c.ShouldBindJSON(&assinaturaDto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dados inválidos",
			"detalhe": err.Error(),
		})
		return
	}

	assinatura, err := servicedto.CriarAssinaturaDTO_CriarAssinatura(assinaturaDto)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = ac.AssinaturaService.Criar(&assinatura)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao criar a assinatura",
		})
		return
	}

	c.JSON(http.StatusCreated, assinatura)
}

// @Summary Listar assinaturas
// @Description Lista todas as assinaturas
// @Tags Admin
// @Produce json
// @Param ativo query bool false "Filtrar por ativo"
// @Success 200 {array} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /admin/assinaturas [get]
func (ac AdminController) ListarAssinaturas(c *gin.Context) {
	ativoStr := c.Query("ativo")
	var ativo *bool
	if ativoStr != "" {
		ativoVal, err := strconv.ParseBool(ativoStr)
		if err == nil {
			ativo = &ativoVal
		}
	}

	assinaturas, err := ac.AssinaturaService.Listar(ativo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, assinaturas)
}

func (ac AdminController) ConsultarAssinaturaClinica(c *gin.Context) {
	clinicaIDStr := c.Param("id")
	clinicaID, err := strconv.ParseUint(clinicaIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID da clinica inválido",
		})
		return
	}
	clinicaIDUint := uint(clinicaID)
	assinatura, err := ac.AssinaturaService.Consultar(&clinicaIDUint, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao buscar assinatura",
		})
		return
	}
	c.JSON(http.StatusOK, assinatura)
}

// assinaturaPrincipalClinica retorna a assinatura ativa mais recente; se não houver ativa, a mais recente da clínica.
func (ac AdminController) assinaturaPrincipalClinica(clinicaID uint) (*models.Assinatura, error) {
	var rows []models.Assinatura
	if err := ac.DB.Where("clinica_id = ?", clinicaID).Order("id DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	for i := range rows {
		if rows[i].Ativa {
			return &rows[i], nil
		}
	}
	if len(rows) == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &rows[0], nil
}

// CriarUsuarioPlataforma cadastra um novo usuário com papel ADM_GERAL (administrador do sistema).
func (ac AdminController) CriarUsuarioPlataforma(c *gin.Context) {
	var body dto.CriarUsuarioPlataformaDTO
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos", "detalhe": err.Error()})
		return
	}
	if t := strings.TrimSpace(body.Senha); t != "" && utf8.RuneCountInString(t) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Senha deve ter pelo menos 6 caracteres ou omita o campo para gerar senha provisória e enviar por e-mail"})
		return
	}
	var tu models.TipoUsuario
	if err := ac.DB.Where("papel = ?", rbac.PapelADMGeral).Order("id ASC").First(&tu).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Perfil de administrador da plataforma não encontrado. Execute as migrations."})
		return
	}
	u := models.Usuario{
		Nome:          strings.TrimSpace(body.Nome),
		Email:         strings.TrimSpace(body.Email),
		Senha:         body.Senha,
		TipoUsuarioID: tu.ID,
	}
	if err := ac.UsuarioService.CriarUsuario(&u, tu.ClinicaID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	u.Senha = ""
	c.JSON(http.StatusCreated, gin.H{
		"usuario":        u,
		"obrigar_troca": u.ObrigarTrocaSenha,
	})
}

// DesativarUsuarioAdmin desativa um usuário com papel ADM_GERAL (não pode ser a própria sessão).
func (ac AdminController) DesativarUsuarioAdmin(c *gin.Context) {
	actorID, err := middleware.ExtrairDoToken[uint](c, "usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	id, err := utils.StringParaUint(c.Param("id"))
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID do usuário inválido"})
		return
	}
	if id == actorID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Não é possível desativar a própria conta"})
		return
	}
	alvo, err := ac.UsuarioService.BuscarPorID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuário não encontrado"})
		return
	}
	if alvo.TipoUsuario.Papel != rbac.PapelADMGeral {
		c.JSON(http.StatusForbidden, gin.H{"error": "Só é permitido desativar contas de administrador da plataforma (ADM_GERAL)"})
		return
	}
	if err := ac.UsuarioService.DesativarUsuario(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Usuário desativado com sucesso"})
}

// ReativarUsuarioAdmin reativa um usuário com papel ADM_GERAL.
func (ac AdminController) ReativarUsuarioAdmin(c *gin.Context) {
	id, err := utils.StringParaUint(c.Param("id"))
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID do usuário inválido"})
		return
	}
	alvo, err := ac.UsuarioService.BuscarPorID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuário não encontrado"})
		return
	}
	if alvo.TipoUsuario.Papel != rbac.PapelADMGeral {
		c.JSON(http.StatusForbidden, gin.H{"error": "Só é permitido reativar contas de administrador da plataforma (ADM_GERAL)"})
		return
	}
	if err := ac.UsuarioService.ReativarUsuario(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Usuário reativado com sucesso"})
}

// AtualizarPlanoClinica altera o plano_id da assinatura principal da clínica.
func (ac AdminController) AtualizarPlanoClinica(c *gin.Context) {
	id, err := utils.StringParaUint(c.Param("id"))
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID da clínica inválido"})
		return
	}
	var body dto.AtualizarPlanoClinicaDTO
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos", "detalhe": err.Error()})
		return
	}
	if _, err := ac.PlanoService.BuscarPorId(int(body.PlanoID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plano não encontrado"})
		return
	}
	a, err := ac.assinaturaPrincipalClinica(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Nenhuma assinatura para esta clínica. Crie uma assinatura no financeiro."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	a.PlanoID = body.PlanoID
	if err := ac.AssinaturaService.Atualizar(a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar assinatura"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"assinatura": a})
}

// AtualizarAssinaturaAdmin ajusta plano, data de expiração e/ou flag ativa de uma assinatura específica.
func (ac AdminController) AtualizarAssinaturaAdmin(c *gin.Context) {
	aid, err := utils.StringParaUint(c.Param("id"))
	if err != nil || aid == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID da assinatura inválido"})
		return
	}
	var body dto.AtualizarAssinaturaAdminDTO
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos", "detalhe": err.Error()})
		return
	}
	if body.PlanoID == nil && body.DataExpiracao == nil && body.Ativa == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Informe ao menos um campo: plano_id, data_expiracao ou ativa"})
		return
	}
	a, err := ac.AssinaturaService.BuscarPorID(aid)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Assinatura não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if body.PlanoID != nil {
		if _, err := ac.PlanoService.BuscarPorId(int(*body.PlanoID)); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Plano não encontrado"})
			return
		}
		a.PlanoID = *body.PlanoID
	}
	if body.DataExpiracao != nil {
		s := strings.TrimSpace(*body.DataExpiracao)
		if s == "" {
			a.DataExpiracao = nil
		} else {
			t, err := time.ParseInLocation("2006-01-02", s, time.Local)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "data_expiracao inválida; use YYYY-MM-DD"})
				return
			}
			di := time.Date(a.DataInicio.Year(), a.DataInicio.Month(), a.DataInicio.Day(), 0, 0, 0, 0, time.Local)
			te := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.Local)
			if te.Before(di) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "data_expiracao não pode ser anterior ao início da assinatura"})
				return
			}
			a.DataExpiracao = &t
		}
	}
	if body.Ativa != nil {
		a.Ativa = *body.Ativa
	}
	if err := ac.AssinaturaService.Atualizar(a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar assinatura"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"assinatura": a})
}

/*Planos*/
func (ac AdminController) CriarPlano(c *gin.Context) {
	var req dto.CriarPlanoDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dados inválidos",
		})
		return
	}

	plano := servicedto.CriarPlanoDTO_CriarPlano(req)

	planoCriado, err := ac.PlanoService.Criar(plano)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao criar o plano",
		})
		return
	}

	c.JSON(http.StatusCreated, planoCriado)
}

func (ac AdminController) AtualizarPlano(c *gin.Context) {
	planoIdStr := c.Param("id")
	planoID, err := strconv.ParseUint(planoIdStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID do plano inválido",
		})
		return
	}

	var req dto.CriarPlanoDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dados inválidos",
		})
		return
	}

	plano := servicedto.CriarPlanoDTO_CriarPlano(req)

	planoAtualizado, err := ac.PlanoService.Atualizar(uint(planoID), plano)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao atualizar o plano",
		})
		return
	}

	c.JSON(http.StatusOK, planoAtualizado)
}

func (ac AdminController) ListarTelasDoPlano(c *gin.Context) {
	planoIdStr := c.Param("id")
	planoID, err := strconv.ParseUint(planoIdStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID do plano inválido",
		})
		return
	}

	telas, err := ac.PlanoTelaService.ListarTelasDoPlano(uint(planoID))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao listar telas do plano",
		})
		return
	}
	c.JSON(http.StatusOK, telas)
}

func (ac AdminController) ListarPlanos(c *gin.Context) {
	ativoStr := c.Query("ativo")
	var ativo *bool
	if ativoStr != "" {
		ativoVal, err := strconv.ParseBool(ativoStr)
		if err == nil {
			ativo = &ativoVal
		}
	}

	planos, err := ac.PlanoService.Listar(ativo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, planos)
}

func (ac AdminController) DesativarPlano(c *gin.Context) {
	planoIdStr := c.Param("id")
	planoID, err := strconv.Atoi(planoIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID do plano inválido",
		})
		return
	}

	err = ac.PlanoService.Desativar(planoID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao desativar o plano",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messagem": "Plano desativado com sucesso",
	})
}

func (ac AdminController) ReativarPlano(c *gin.Context) {
	planoIdStr := c.Param("id")
	planoID, err := strconv.Atoi(planoIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID do plano inválido",
		})
		return
	}

	err = ac.PlanoService.Reativar(planoID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao ativar o plano",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messagem": "Plano reativado com sucesso",
	})
}

/*Planos*/
/*Telas*/
func (ac AdminController) CriarTela(c *gin.Context) {
	var telaDto dto.CriarTelaDTO
	if err := c.ShouldBindJSON(&telaDto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dados inválidos",
		})
		return
	}

	tela := servicedto.CriarTelaDTO_CriarTela(telaDto)

	err := ac.TelaService.CriarTela(&tela)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao cadastrar tela",
		})
		return
	}

	c.JSON(http.StatusCreated, tela)
}

func (ac AdminController) AtualizarTela(c *gin.Context) {
	telaIDStr := c.Param("id")
	telaID, err := strconv.Atoi(telaIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID da tela inválido",
		})
		return
	}

	var telaDto dto.CriarTelaDTO
	if err := c.ShouldBindJSON(&telaDto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dados inválidos",
		})
		return
	}

	tela := servicedto.CriarTelaDTO_CriarTela(telaDto)
	tela.ID = uint(telaID)
	err = ac.TelaService.AtualizarTela(&tela)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao atualizar tela",
		})
		return
	}

	c.JSON(http.StatusOK, tela)
}

func (ac AdminController) ListarTelas(c *gin.Context) {
	telas, err := ac.TelaService.ListarTelas()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao listar telas",
		})
		return
	}

	c.JSON(http.StatusOK, telas)
}

func (ac AdminController) DesativarTela(c *gin.Context) {
	telaIDStr := c.Param("id")
	telaID, err := strconv.Atoi(telaIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID da tela inválido",
		})
		return
	}

	err = ac.TelaService.Desativar(telaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao consultar tela",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"mensagem": "Tela desativada com sucesso",
	})
}

func (ac AdminController) ReativarTela(c *gin.Context) {
	telaIDStr := c.Param("id")
	telaID, err := strconv.Atoi(telaIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID da tela inválido",
		})
		return
	}

	err = ac.TelaService.Reativar(telaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao consultar tela",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"mensagem": "Tela ativada com sucesso",
	})
}

/*Telas*/

/*Plano Telas*/
func (ac AdminController) AssociarPlanoTela(c *gin.Context) {
	var planoTela models.PlanoTela
	if err := c.ShouldBindJSON(&planoTela); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	if err := ac.PlanoTelaService.Criar(&planoTela); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, planoTela)
}
func (ac AdminController) RemoverTelaDoPlano(c *gin.Context) {
	planoIDStr := c.Param("id")
	telaIDStr := c.Param("tela_id")

	planoID, err := strconv.ParseUint(planoIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID do plano inválido",
		})
		return
	}

	telaID, err := strconv.ParseUint(telaIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID da tela inválido",
		})
		return
	}

	err = ac.PlanoTelaService.RemoverTelaDoPlano(uint(planoID), uint(telaID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao remover tela do plano",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messagem": "Tela removida do plano com sucesso",
	})

}

/*Plano Telas*/

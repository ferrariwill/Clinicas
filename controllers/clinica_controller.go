package controllers

import (
	"net/http"
	"regexp"
	"strconv"

	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/models/DTO"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/repositories"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type ClinicaController struct {
	service         services.ClinicaService
	configService   services.ConfiguracaoService
	usuarioService  services.UsuarioService
	tipoUsuarioRepo repositories.TipoUsuarioRepository
}

func NovaClinicaController(s services.ClinicaService, configService services.ConfiguracaoService, usuarioService services.UsuarioService, tipoUsuarioRepo repositories.TipoUsuarioRepository) *ClinicaController {
	return &ClinicaController{
		service:         s,
		configService:   configService,
		usuarioService:  usuarioService,
		tipoUsuarioRepo: tipoUsuarioRepo,
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

	// Criar tipo usuário admin para a clínica
	tipoUsuario := models.TipoUsuario{
		Nome:      "Administrador",
		Descricao: "Administrador da clínica",
		ClinicaID: clinica.ID,
	}
	if err := cc.tipoUsuarioRepo.CriarTipoUsuario(&tipoUsuario); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao criar tipo usuário"})
		return
	}

	// Criar usuário admin
	adminPassword := regexp.MustCompile(`\D`).ReplaceAllString(clinica.CNPJ, "")
	senhaHash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	adminEmail := clinica.EmailResponsavel
	usuario := models.Usuario{
		Nome:          "Administrador",
		Email:         adminEmail,
		Senha:         string(senhaHash),
		Ativo:         true,
		ClinicaID:     clinica.ID,
		TipoUsuarioID: tipoUsuario.ID,
	}
	if err := cc.usuarioService.CriarUsuario(&usuario, clinica.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": "Erro ao criar usuário admin"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"clinica": clinica, "usuario_admin": gin.H{"email": adminEmail, "senha": adminPassword}})
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
	id, _ := strconv.Atoi(c.Param("id"))
	var clinica models.Clinica
	if err := c.ShouldBindJSON(&clinica); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos"})
		return
	}
	clinica.ID = uint(id)

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

	if err := cc.service.AtualizarClinica(&clinica, usuarioClinicaID, tipoUsuarioID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"clinica": clinica})
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

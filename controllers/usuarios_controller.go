package controllers

import (
	"net/http"
	"strconv"

	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
)

type UsuarioController struct {
	usuarioService services.UsuarioService
}

func NovoUsuarioController(usuarioService services.UsuarioService) *UsuarioController {
	return &UsuarioController{usuarioService: usuarioService}
}

// @Summary Criar usuário
// @Description Cria um novo usuário na clínica
// @Tags Usuários
// @Accept json
// @Produce json
// @Param usuario body UsuarioRequest true "Dados do usuário"
// @Success 201 {object} UsuarioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios [post]
func (uc *UsuarioController) Criar(c *gin.Context) {
	var u models.Usuario

	if err := c.ShouldBindJSON(&u); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clinicaId, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := uc.usuarioService.CriarUsuario(&u, clinicaId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"usuario": u})
}

// @Summary Listar usuários
// @Description Lista todos os usuários da clínica
// @Tags Usuários
// @Accept json
// @Produce json
// @Param ativos query boolean false "Filtrar apenas usuários ativos"
// @Success 200 {array} UsuarioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios [get]
func (uc *UsuarioController) Listar(c *gin.Context) {
	clinicaId, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var filtro *bool
	if param := c.Query("ativos"); param != "" {
		ativo := param == "true"
		filtro = &ativo
	}

	usuarios, err := uc.usuarioService.ListarPorClinica(clinicaId, filtro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"usuarios": usuarios})
}

// @Summary Buscar usuário por ID
// @Description Busca um usuário específico pelo ID
// @Tags Usuários
// @Accept json
// @Produce json
// @Param id path int true "ID do usuário"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /usuarios/{id} [get]
// @Summary Buscar usuário por ID
// @Description Busca um usuário específico pelo ID
// @Tags Usuários
// @Accept json
// @Produce json
// @Param id path int true "ID do usuário"
// @Success 200 {object} UsuarioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios/{id} [get]
func (uc *UsuarioController) Buscar(c *gin.Context) {
	id := c.Param("id")
	usuarioId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	usuario, err := uc.usuarioService.BuscarPorID(uint(usuarioId))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"usuario": usuario})
}

// @Summary Atualizar usuário
// @Description Atualiza os dados de um usuário
// @Tags Usuários
// @Accept json
// @Produce json
// @Param id path int true "ID do usuário"
// @Param usuario body UsuarioRequest true "Dados do usuário"
// @Success 200 {object} UsuarioResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios/{id} [put]
func (uc *UsuarioController) Atualizar(c *gin.Context) {
	id := c.Param("id")
	usuarioId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var u models.Usuario
	u.ID = uint(usuarioId)
	if err := c.ShouldBindJSON(&u); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := uc.usuarioService.AtualizarUsuario(&u); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"usuario": u})
}

// @Summary Desativar usuário
// @Description Desativa um usuário
// @Tags Usuários
// @Accept json
// @Produce json
// @Param id path int true "ID do usuário"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /usuarios/{id} [delete]
func (uc *UsuarioController) Deletar(c *gin.Context) {
	id := c.Param("id")
	usuarioId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if err := uc.usuarioService.DesativarUsuario(uint(usuarioId)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usuário desativado com sucesso"})
}

func (uc *UsuarioController) Ativar(c *gin.Context) {
	id := c.Param("id")
	usuarioId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	if err := uc.usuarioService.ReativarUsuario(uint(usuarioId)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usuário ativado com sucesso"})
}

func (uc *UsuarioController) ListarTodos(c *gin.Context) {
	var filtro *bool
	if param := c.Query("ativos"); param != "" {
		ativo := param == "true"
		filtro = &ativo
	}
	usuarios, err := uc.usuarioService.Listar(filtro)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao consultar usuarios"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"usuarios": usuarios})
}

func (uc *UsuarioController) CriarUsuarioClinica(c *gin.Context) {
	var dto dto.CriarUsuarioClinicaDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	usuarioClinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Erro ao extrair clinica_id do token"})
		return
	}

	usuario, err := uc.usuarioService.CriarUsuarioClinica(dto, usuarioClinicaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar usuário"})
		return
	}
	usuario.Senha = ""
	c.JSON(http.StatusCreated, usuario)
}

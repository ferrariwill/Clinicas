package controllers

import (
	"net/http"
	"strconv"

	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
)

type UsuarioController struct {
	usuarioService services.UsuarioService
}

func NovoUsuarioController(usuarioService services.UsuarioService) *UsuarioController {
	return &UsuarioController{usuarioService: usuarioService}
}

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

package controllers

import (
	"net/http"
	"strconv"

	"github.com/ferrariwill/Clinicas/models"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
)

type AdminController struct {
	PlanoService     services.PlanoService
	TelaService      services.TelaService
	PlanoTelaService services.PlanoTelaService
}

func NovoAdminController(planoService services.PlanoService, telaService services.TelaService, planoTelaService services.PlanoTelaService) AdminController {
	return AdminController{
		PlanoService:     planoService,
		TelaService:      telaService,
		PlanoTelaService: planoTelaService,
	}
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

func (ac AdminController) CriarPlano(c *gin.Context) {
	var plano models.Plano
	if err := c.ShouldBindJSON(&plano); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	planoCriado, err := ac.PlanoService.Criar(plano)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, planoCriado)
}

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

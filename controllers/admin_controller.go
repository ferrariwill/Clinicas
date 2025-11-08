package controllers

import (
	"net/http"
	"strconv"

	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/gin-gonic/gin"
)

type AdminController struct {
	PlanoService      services.PlanoService
	TelaService       services.TelaService
	PlanoTelaService  services.PlanoTelaService
	AssinaturaService services.AssinaturaService
}

func NovoAdminController(planoService services.PlanoService,
	telaService services.TelaService,
	planoTelaService services.PlanoTelaService,
	assinaturaService services.AssinaturaService,
) AdminController {
	return AdminController{
		PlanoService:      planoService,
		TelaService:       telaService,
		PlanoTelaService:  planoTelaService,
		AssinaturaService: assinaturaService,
	}
}

/*Assinaturas*/

func (ac AdminController) CriarAssinatura(c *gin.Context) {
	var assinaturaDto dto.CriarAssinaturaDTO
	if err := c.ShouldBindJSON(&assinaturaDto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dados inválidos",
		})
		return
	}

	assinatura := servicedto.CriarAssinaturaDTO_CriarAssinatura(assinaturaDto)

	err := ac.AssinaturaService.Criar(&assinatura)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao criar a assinatura",
		})
		return
	}

	c.JSON(http.StatusCreated, assinatura)
}

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

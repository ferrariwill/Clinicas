package controllers

import (
	"net/http"

	"github.com/ferrariwill/Clinicas/middleware"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/ferrariwill/Clinicas/utils"
	"github.com/gin-gonic/gin"
)

type ProcedimentoController struct {
	service services.ProcedimentoService
}

func NovoProcedimentoController(service services.ProcedimentoService) *ProcedimentoController {
	return &ProcedimentoController{service: service}
}

// @Summary Cadastrar procedimento
// @Description Cadastra um novo procedimento na clínica
// @Tags Procedimentos
// @Accept json
// @Produce json
// @Param procedimento body ProcedimentoRequest true "Dados do procedimento"
// @Success 201 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /procedimentos [post]
func (c *ProcedimentoController) Cadastrar(ctx *gin.Context) {
	var dto dto.CriarProcedimentoDTO
	erro := ctx.ShouldBindJSON(&dto)

	if erro != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": erro.Error(),
		})
		return
	}

	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}

	procedimento := servicedto.CriarProcedimentoDTO_CriarProcedimento(dto, clinicaID)

	err = c.service.Criar(&procedimento)
	if err != nil {
		ctx.JSON(400, gin.H{
			"erro": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{"mensagem": "Procedimento Criado"})
}

func (c *ProcedimentoController) Atualizar(ctx *gin.Context) {
	var dto dto.CriarProcedimentoDTO
	id := ctx.Param("id")

	erro := ctx.ShouldBindJSON(&dto)

	if erro != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": erro.Error(),
		})
		return
	}

	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}

	procedimento := servicedto.CriarProcedimentoDTO_CriarProcedimento(dto, clinicaID)
	procedimento.ID, err = utils.StringParaUint(id)
	err = c.service.Atualizar(&procedimento)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"mensagem": "Procedimento Atualizado"})
}

// @Summary Listar procedimentos por clínica
// @Description Lista todos os procedimentos da clínica
// @Tags Procedimentos
// @Accept json
// @Produce json
// @Param ativas query boolean false "Filtrar apenas procedimentos ativos"
// @Success 200 {array} ProcedimentoResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /procedimentos [get]
func (c *ProcedimentoController) BuscarPorClinica(ctx *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}
	var filtro *bool
	if param := ctx.Query("ativas"); param != "" {
		val := param == "true"
		filtro = &val
	}

	procedimentos, err := c.service.BuscarPorClinica(clinicaID, filtro)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, procedimentos)
}

func (c *ProcedimentoController) Desativar(ctx *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}
	id := ctx.Param("id")
	if id == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"erro": "id não informado",
		})
		return
	}

	idUint, err := utils.StringParaUint(id)

	err = c.service.Desativar(idUint, clinicaID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"mensagem": "Procedimento desativado"})
}

func (c *ProcedimentoController) Reativar(ctx *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}
	id := ctx.Param("id")
	if id == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"erro": "id não informado",
		})
		return
	}

	idUint, err := utils.StringParaUint(id)

	err = c.service.Reativar(idUint, clinicaID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"mensagem": "Procedimento ativado"})
}

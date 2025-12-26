package controllers

import (
	"net/http"

	"github.com/ferrariwill/Clinicas/middleware"
	"github.com/ferrariwill/Clinicas/models"
	dto "github.com/ferrariwill/Clinicas/models/DTO"
	servicedto "github.com/ferrariwill/Clinicas/models/DTO/ServiceDTO"
	"github.com/ferrariwill/Clinicas/services"
	"github.com/ferrariwill/Clinicas/utils"
	"github.com/gin-gonic/gin"
)

type ConvenioController struct {
	service services.ConvenioServices
}

func NovoConvenioCoontroller(service services.ConvenioServices) *ConvenioController {
	return &ConvenioController{
		service: service,
	}
}

// @Summary Cadastrar Convênio
// @Description Cadastrar um novo convênio
// @Tags Convênios
// @Accept json
// @Produce json
// @Success 201 {object} map[string]interface{}
// @Router /convenios [post]
// @Security BearerAuth
func (c ConvenioController) Cadastrar(ctx *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var dto dto.CriarConvenioDTO
	err = ctx.ShouldBindJSON(&dto)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var convenio models.Convenio
	convenio.ClinicaID = clinicaID
	convenio.Nome = dto.Nome
	convenio.Ativo = dto.Ativo
	err = c.service.Criar(convenio)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusCreated, gin.H{"mensagem": "Convenio criado com sucesso!"})
}

// @Summary Atualizar Convênio
// @Description Atualizar um convênio existente
// @Tags Convênios
// @Accept json
// @Produce json
// @Param id path int true "ID do convênio"
// @Success 200 {object} map[string]interface{}
// @Router /convenios/{id} [put]
// @Security BearerAuth
func (c ConvenioController) Atualizar(ctx *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var dto dto.CriarConvenioDTO
	id := ctx.Param("id")

	err = ctx.ShouldBindJSON(&dto)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var convenio models.Convenio
	convenio.ID, err = utils.StringParaUint(id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}
	convenio.ClinicaID = clinicaID
	convenio.Nome = dto.Nome
	convenio.Ativo = dto.Ativo
	err = c.service.Atualizar(&convenio)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"mensagem": "Convenio atualizado com sucesso!"})
}

func (c ConvenioController) BuscarConvenio(ctx *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	var filtro *bool
	if param := ctx.Query("ativos"); param != "" {
		val := param == "true"
		filtro = &val
	}

	convenios, err := c.service.BuscarPorClinica(clinicaID, filtro)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, convenios)
}

func (c ConvenioController) Desativar(ctx *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	id := ctx.Param("id")
	convenioID, err := utils.StringParaUint(id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}

	err = c.service.Desativar(clinicaID, convenioID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"mensagem": "Convenio desativado com sucesso!"})
}

func (c ConvenioController) Reativar(ctx *gin.Context) {
	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	id := ctx.Param("id")
	convenioID, err := utils.StringParaUint(id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}

	err = c.service.Reativar(clinicaID, convenioID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"mensagem": "Convenio reativado com sucesso!"})
}

func (c ConvenioController) CadastrarProcedimento(ctx *gin.Context) {

	var dto dto.ConvenioProcedimentoDTO
	err := ctx.ShouldBindJSON(&dto)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	convenioProcedimento := servicedto.CriarConvenioProcedimentoDTO_ConvenioProcedimento(dto)
	err = c.service.CadastrarProcedimento(convenioProcedimento)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusCreated, gin.H{"mensagem": "Procedimento criado com sucesso!"})
}

func (c ConvenioController) AtualizarProcedimento(ctx *gin.Context) {

	var dto dto.ConvenioProcedimentoDTO
	err := ctx.ShouldBindJSON(&dto)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	convenioProcedimento := servicedto.CriarConvenioProcedimentoDTO_ConvenioProcedimento(dto)
	err = c.service.AtualizaProcedimentoPorConvenio(&convenioProcedimento)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"mensagem": "Procedimento atualizado com sucesso!"})
}

func (c ConvenioController) BuscarProcedimentos(ctx *gin.Context) {

	id := ctx.Param("id")
	convenioID, err := utils.StringParaUint(id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"erro": err.Error(),
		})
		return
	}

	procedimentos, err := c.service.BuscarProcedimentosPorConvenio(convenioID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, procedimentos)
}

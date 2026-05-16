package controllers

import (
	"net/http"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/middleware"
	dto "github.com/ferrariwill/Clinicas/API/models/DTO"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

type PlanoTratamentoController struct {
	svc *services.PlanoTratamentoService
}

func NovoPlanoTratamentoController(svc *services.PlanoTratamentoService) *PlanoTratamentoController {
	return &PlanoTratamentoController{svc: svc}
}

// Registrar grava plano no prontuário e atualiza lembretes no paciente. A agenda é montada pela secretaria/gestão.
// POST /clinicas/plano-tratamento
func (c *PlanoTratamentoController) Registrar(ctx *gin.Context) {
	papel, _ := middleware.ExtrairDoToken[string](ctx, "papel")
	if !rbac.PodeGerenciarProntuario(papel) {
		ctx.JSON(http.StatusForbidden, gin.H{"erro": "Sem permissão para registrar plano de tratamento"})
		return
	}
	clinicaID, err := middleware.ExtrairDoToken[uint](ctx, "clinica_id")
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	usuarioID, err := middleware.ExtrairDoToken[uint](ctx, "usuario_id")
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}

	var body dto.PlanoTratamentoRequest
	if err := ctx.ShouldBindJSON(&body); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"erro": "Dados inválidos", "detalhes": err.Error()})
		return
	}

	if papel == rbac.PapelMedico && body.UsuarioID != usuarioID {
		ctx.JSON(http.StatusForbidden, gin.H{"erro": "Médico só pode criar plano na própria agenda (usuario_id deve ser o seu)"})
		return
	}

	res, err := c.svc.Registrar(clinicaID, usuarioID, body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	status := http.StatusCreated
	if res.Aviso != "" {
		status = http.StatusOK
	}
	ctx.JSON(status, gin.H{
		"prontuario_id":         res.ProntuarioID,
		"agendas":               res.Agendas,
		"aviso":                 res.Aviso,
		"informar_secretaria": res.InformarSecretaria,
	})
}

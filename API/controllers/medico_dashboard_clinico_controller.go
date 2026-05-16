package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/ferrariwill/Clinicas/API/internal/rbac"
	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/ferrariwill/Clinicas/API/utils"
	"github.com/gin-gonic/gin"
)

type MedicoDashboardClinicoController struct {
	svc services.MedicoDashboardClinicoService
}

func NovoMedicoDashboardClinicoController(svc services.MedicoDashboardClinicoService) *MedicoDashboardClinicoController {
	return &MedicoDashboardClinicoController{svc: svc}
}

// DashboardClinico agrega CID-10 e volume semanal de prontuário + atestados do usuário logado.
// GET /clinicas/me/dashboard-clinico?semanas=12
func (ctl *MedicoDashboardClinicoController) DashboardClinico(c *gin.Context) {
	papel, err := middleware.ExtrairDoToken[string](c, "papel")
	if err != nil || !rbac.PodeDescriptografarProntuario(papel) {
		c.JSON(http.StatusForbidden, gin.H{"erro": "Disponível apenas para perfil com acesso clínico completo (ex.: médico ou dono)."})
		return
	}
	clinicaID, err := middleware.ExtrairDoToken[uint](c, "clinica_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	usuarioID, err := middleware.ExtrairDoToken[uint](c, "usuario_id")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	semanas := 12
	if q := strings.TrimSpace(c.Query("semanas")); q != "" {
		if n, err := strconv.Atoi(q); err == nil {
			semanas = n
		}
	}

	out, err := ctl.svc.Resumo(clinicaID, usuarioID, semanas)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": utils.SafeErrorMessage(err, "Não foi possível montar o resumo clínico")})
		return
	}
	c.JSON(http.StatusOK, out)
}

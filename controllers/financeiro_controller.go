package controllers

import "github.com/gin-gonic/gin"

type FinanceiroController struct {
}

func NovoFinanceiroController() *FinanceiroController {
	return &FinanceiroController{}
}

// @Summary Abrir Financeiro
// @Description Abrir módulo financeiro
// @Tags Financeiro
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /financeiro/abrir [get]
// @Security BearerAuth
func (fc FinanceiroController) Abrir(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "Abrir Financeiro",
	})
}

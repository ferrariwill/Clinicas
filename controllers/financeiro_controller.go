package controllers

import "github.com/gin-gonic/gin"

type FinanceiroController struct {
}

func NovoFinanceiroController() *FinanceiroController {
	return &FinanceiroController{}
}
func (fc FinanceiroController) Abrir(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "Abrir Financeiro",
	})
}

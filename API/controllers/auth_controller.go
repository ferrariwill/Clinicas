package controllers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/ferrariwill/Clinicas/API/middleware"
	"github.com/ferrariwill/Clinicas/API/models"
	"github.com/ferrariwill/Clinicas/API/services"
	"github.com/gin-gonic/gin"
)

func usuarioInfoFromModel(usuario *models.Usuario) UsuarioInfo {
	papel := ""
	if usuario.TipoUsuario.Papel != "" {
		papel = usuario.TipoUsuario.Papel
	}
	cid := usuario.ClinicaID
	return UsuarioInfo{
		ID:                usuario.ID,
		Nome:              usuario.Nome,
		Email:             usuario.Email,
		TipoUsuarioID:     usuario.TipoUsuarioID,
		ClinicaID:         &cid,
		Papel:             papel,
		ObrigarTrocaSenha: usuario.ObrigarTrocaSenha,
	}
}

// LoginRequest representa os dados de login
type LoginRequest struct {
	Email string `json:"email" binding:"required,email" example:"usuario@exemplo.com"`
	Senha string `json:"senha" binding:"required" example:"123456"`
}

// LoginResponse representa a resposta do login
type LoginResponse struct {
	Token   string      `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	Usuario UsuarioInfo `json:"usuario"`
	// ObrigarTrocaSenha indica que o front deve forçar alteração de senha antes do uso normal.
	ObrigarTrocaSenha bool `json:"obrigar_troca_senha"`
}

// UsuarioInfo representa as informações do usuário
type UsuarioInfo struct {
	ID                 uint   `json:"id" example:"1"`
	Nome               string `json:"nome" example:"João Silva"`
	Email              string `json:"email" example:"joao@exemplo.com"`
	TipoUsuarioID      uint   `json:"tipo_usuario_id" example:"1"`
	ClinicaID          *uint  `json:"clinica_id" example:"1"`
	Papel              string `json:"papel" example:"MEDICO"`
	ObrigarTrocaSenha  bool   `json:"obrigar_troca_senha"`
}

// @Summary Login de usuário
// @Description Autentica um usuário e retorna um token JWT
// @Tags Autenticação
// @Accept json
// @Produce json
// @Param login body LoginRequest true "Dados de login"
// @Success 200 {object} LoginResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /login [post]
func LoginHandler(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req LoginRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		usuario, err := authService.Login(req.Email, req.Senha)
		if err != nil {
			if errors.Is(err, services.ErrCredenciaisInvalidas) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao autenticar. Tente novamente."})
			return
		}

		token, err := middleware.GerarToken(usuario)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar o token"})
			return
		}

		c.JSON(http.StatusOK, LoginResponse{
			Token:             token,
			ObrigarTrocaSenha: usuario.ObrigarTrocaSenha,
			Usuario:           usuarioInfoFromModel(usuario),
		})

	}
}

// TrocarClinicaBody define o corpo de POST /auth/trocar-clinica.
type TrocarClinicaBody struct {
	ClinicaID uint `json:"clinica_id" binding:"required"`
}

// MinhasClinicasHandler lista clínicas às quais o usuário tem acesso (associações ou, para ADM_GERAL, todas as ativas).
func MinhasClinicasHandler(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		usuarioID, err := middleware.ExtrairDoToken[uint](c, "usuario_id")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			return
		}
		papel, _ := middleware.ExtrairDoToken[string](c, "papel")
		list, err := authService.MinhasClinicas(usuarioID, papel)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"clinicas": list})
	}
}

// TrocarClinicaHandler atualiza o contexto ativo do usuário e devolve um novo JWT.
func TrocarClinicaHandler(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req TrocarClinicaBody
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		usuarioID, err := middleware.ExtrairDoToken[uint](c, "usuario_id")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			return
		}
		papel, _ := middleware.ExtrairDoToken[string](c, "papel")
		usuario, err := authService.TrocarClinicaAtiva(usuarioID, req.ClinicaID, papel)
		if err != nil {
			msg := err.Error()
			low := strings.ToLower(msg)
			if strings.Contains(low, "não tem acesso") || strings.Contains(low, "nao tem acesso") {
				c.JSON(http.StatusForbidden, gin.H{"error": msg})
				return
			}
			if strings.Contains(low, "não encontrada") || strings.Contains(low, "nao encontrada") {
				c.JSON(http.StatusNotFound, gin.H{"error": msg})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
			return
		}
		token, err := middleware.GerarToken(usuario)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar o token"})
			return
		}
		c.JSON(http.StatusOK, LoginResponse{
			Token:             token,
			ObrigarTrocaSenha: usuario.ObrigarTrocaSenha,
			Usuario:           usuarioInfoFromModel(usuario),
		})
	}
}

// AlterarSenhaRequest representa os dados para alterar senha
type AlterarSenhaRequest struct {
	Senha     string `json:"senha" binding:"required" example:"senhaAtual123"`
	NovaSenha string `json:"nova_senha" binding:"required" example:"novaSenha456"`
}

// @Summary Alterar senha
// @Description Altera a senha do usuário autenticado
// @Tags Autenticação
// @Accept json
// @Produce json
// @Param dados body AlterarSenhaRequest true "Dados para alterar senha"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /auth/alterar-senha [put]
func AlterarSenhaHandler(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req AlterarSenhaRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		usuarioId, _ := middleware.ExtrairDoToken[uint](c, "usuario_id")
		err := authService.AlterarSenha(usuarioId, req.Senha, req.NovaSenha)
		if err != nil {
			// 400 evita que o cliente trate como sessão expirada (interceptors costumam limpar token em 401).
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Senha alterada com sucesso"})

	}
}

// EsqueciSenhaRequest representa os dados para esqueci senha
type EsqueciSenhaRequest struct {
	Email string `json:"email" binding:"required,email" example:"usuario@exemplo.com"`
}

// RedefinirSenhaRequest representa os dados para redefinir senha
type RedefinirSenhaRequest struct {
	Token     string `json:"token" binding:"required" example:"abc123token"`
	NovaSenha string `json:"nova_senha" binding:"required" example:"novaSenha123"`
}

// @Summary Esqueci minha senha
// @Description Envia email para redefinição de senha
// @Tags Autenticação
// @Accept json
// @Produce json
// @Param dados body EsqueciSenhaRequest true "Email para redefinição"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /auth/esqueci-senha [post]
func EsqueciSenhaHandler(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req EsqueciSenhaRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := authService.GerarTokenRedifinicao(req.Email)
		if err != nil {
			if errors.Is(err, services.ErrEmailNaoCadastradoRecuperacao) {
				c.JSON(http.StatusOK, gin.H{"message": "SE O E-MAIL ESTIVER CADASTRADO, VOCÊ RECEBERÁ UMA SENHA PROVISÓRIA."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "SE O E-MAIL ESTIVER CADASTRADO, VOCÊ RECEBERÁ UMA SENHA PROVISÓRIA."})

	}
}

// @Summary Redefinir senha
// @Description Redefine a senha usando token recebido por email
// @Tags Autenticação
// @Accept json
// @Produce json
// @Param dados body RedefinirSenhaRequest true "Token e nova senha"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /auth/redefinir-senha [post]
func RedefinirSenhaHandler(authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req RedefinirSenhaRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := authService.RedefinirSenha(req.Token, req.NovaSenha)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Senha redefinida com sucesso"})

	}
}

// MinhasPermissoesRotasHandler retorna as rotas de API (FullPath) permitidas ao tipo do usuário logado, ou acesso_total para dono/admin global.
func MinhasPermissoesRotasHandler(permissaoTelaService services.PermissaoTelaService) gin.HandlerFunc {
	return func(c *gin.Context) {
		tipoUsuarioID, err := middleware.ExtrairDoToken[uint](c, "tipo_usuario_id")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			return
		}
		rotas, acessoTotal, err := permissaoTelaService.ListarRotasPermitidas(tipoUsuarioID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar permissões"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"rotas":        rotas,
			"acesso_total": acessoTotal,
		})
	}
}

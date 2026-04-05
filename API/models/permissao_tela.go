package models

import "gorm.io/gorm"

type PermissaoTela struct {
	gorm.Model
	TipoUsuarioID uint        `json:"tipo_usuario_id"`
	TipoUsuario   TipoUsuario `gorm:"foreignKey:TipoUsuarioID"`
	TelaID        uint        `json:"tela_id"`
	Tela          Tela        `gorm:"foreignKey:TelaID"`
}

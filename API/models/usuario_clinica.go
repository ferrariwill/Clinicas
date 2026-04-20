package models

import "gorm.io/gorm"

// UsuarioClinica vincula um usuário a uma clínica com um papel (tipo) nessa clínica.
// A linha em usuarios (clinica_id / tipo_usuario_id) representa o contexto ativo após login ou troca.
type UsuarioClinica struct {
	gorm.Model
	UsuarioID     uint `json:"usuario_id" gorm:"uniqueIndex:ux_usuario_clinica;index"`
	ClinicaID     uint `json:"clinica_id" gorm:"uniqueIndex:ux_usuario_clinica;index"`
	TipoUsuarioID uint `json:"tipo_usuario_id"`
	Ativo         bool `json:"ativo" gorm:"default:true"`
	Usuario       Usuario     `gorm:"foreignKey:UsuarioID"`
	Clinica       Clinica     `gorm:"foreignKey:ClinicaID"`
	TipoUsuario   TipoUsuario `gorm:"foreignKey:TipoUsuarioID"`
}

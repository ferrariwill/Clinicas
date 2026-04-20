package models

import "gorm.io/gorm"

type Usuario struct {
	gorm.Model
	Nome          string `json:"nome"`
	Email         string `json:"email" gorm:"unique"`
	Senha         string `json:"-"`
	// ObrigarTrocaSenha: verdadeiro após criação pela equipe ou recuperação de senha — o front força troca no primeiro acesso.
	ObrigarTrocaSenha bool `json:"obrigar_troca_senha" gorm:"default:false"`
	Ativo             bool `json:"ativo"`
	ClinicaID     uint        `json:"clinica_id"`
	Clinica       Clinica     `gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"`
	TipoUsuarioID uint        `json:"tipo_usuario_id"`
	TipoUsuario   TipoUsuario `gorm:"foreignKey:TipoUsuarioID;constraint:OnDelete:CASCADE" json:"tipo_usuario,omitempty"`
	MaxPacientes       int  `json:"max_pacientes" gorm:"default:1"`
	// PermiteSimultaneo permite mais de um agendamento no mesmo horário (ex.: atendimentos em grupo).
	PermiteSimultaneo bool `json:"permite_simultaneo" gorm:"default:false"`
}

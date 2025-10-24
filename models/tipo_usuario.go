package models

type TipoUsuario struct {
	ID        uint `gorm:"primaryKey"`
	Nome      string
	Descricao string
	ClinicaID uint
	Clinica   Clinica `gorm:"foreignKey:ClinicaID;constraint:OnDelete:CASCADE"`
}

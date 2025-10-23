package models

type Permissao struct {
	ID               uint `gorm:"primaryKey"`
	TipoUsuarioID    uint
	FuncionalidadeID uint
}

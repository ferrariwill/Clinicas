package models

type Funcionalidade struct {
	ID   uint `gorm:"primaryKey"`
	Nome string
}

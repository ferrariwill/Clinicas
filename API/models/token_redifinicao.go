package models

import "time"

type TokenRedifinicao struct {
	ID        uint `gorm:"primaryKey"`
	Email     string
	Token     string
	Expiracao time.Time
	Ativo     bool
}

package models

import "gorm.io/gorm"

type StatusAgendamento struct {
	gorm.Model
	Nome string `json:"nome"`
}

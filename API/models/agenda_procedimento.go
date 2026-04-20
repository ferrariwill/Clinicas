package models

// AgendaProcedimento vincula procedimentos adicionais a um agendamento (além do principal em Agenda.ProcedimentoID).
type AgendaProcedimento struct {
	AgendaID       uint `gorm:"primaryKey"`
	ProcedimentoID uint `gorm:"primaryKey"`
	Procedimento   Procedimento `gorm:"foreignKey:ProcedimentoID"`
}

package models

import "gorm.io/gorm"

type ClinicaConfiguracao struct {
	gorm.Model
	ClinicaID              uint    `json:"clinica_id"`
	Clinica                Clinica `gorm:"foreignKey:ClinicaID"`
	HorarioInicioSemana    string  `json:"horario_inicio_semana" example:"08:00"`
	HorarioFimSemana       string  `json:"horario_fim_semana" example:"18:00"`
	HorarioInicioSabado    string  `json:"horario_inicio_sabado" example:"08:00"`
	HorarioFimSabado       string  `json:"horario_fim_sabado" example:"12:00"`
	FuncionaDomingo        bool    `json:"funciona_domingo" example:"false"`
	HorarioInicioDomingo   string  `json:"horario_inicio_domingo" example:""`
	HorarioFimDomingo      string  `json:"horario_fim_domingo" example:""`
	IntervaloConsulta      int     `json:"intervalo_consulta" example:"30"`
	TempoAntecedencia      int     `json:"tempo_antecedencia" example:"24"`
	LimiteAgendamentosDia  int     `json:"limite_agendamentos_dia" example:"50"`
	PermiteAgendamentoFds  bool    `json:"permite_agendamento_fds" example:"false"`
	EmailNotificacao       string  `json:"email_notificacao" example:"contato@clinica.com"`
	TelefoneWhatsapp       string  `json:"telefone_whatsapp" example:"11999999999"`
	MensagemBoasVindas     string  `json:"mensagem_boas_vindas" example:"Bem-vindo à nossa clínica!"`
}
package DTO

// MedicoDashboardClinicoResponse agrega prontuário e atestados do profissional logado.
type MedicoDashboardClinicoResponse struct {
	Semanas int `json:"semanas"`

	CidMaisComuns []MedicoDashboardCIDItem `json:"cid_mais_comuns"`

	VolumePorSemana []MedicoDashboardSemanaVol `json:"volume_por_semana"`
}

// MedicoDashboardCIDItem contagem de CID-10 (atestados + menções únicas por registro de prontuário).
type MedicoDashboardCIDItem struct {
	CID   string `json:"cid"`
	Total int    `json:"total"`
}

// MedicoDashboardSemanaVol volume de registros clínicos por semana ISO.
type MedicoDashboardSemanaVol struct {
	Ano    int `json:"ano"`
	Semana int `json:"semana"`
	Rotulo string `json:"rotulo"`

	Prontuarios int `json:"prontuarios"`
	Atestados   int `json:"atestados"`
	Total       int `json:"total"`
}

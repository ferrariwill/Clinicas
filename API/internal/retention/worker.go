package retention

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ferrariwill/Clinicas/API/models"
	"gorm.io/gorm"
)

const (
	defaultIntervalDays = 30
)

type RunReport struct {
	ExecutedAt                time.Time `json:"executed_at"`
	CutoffAuditLogs           string    `json:"cutoff_audit_logs"`
	CutoffPacientesDeletados  string    `json:"cutoff_pacientes_deletados"`
	AuditLogsDeleted          int64     `json:"audit_logs_deleted"`
	PacientesDeletadosDeleted int64     `json:"pacientes_deletados_deleted"`
}

// StartWorker inicia um worker mensal de retenção:
// - audit_logs: remove registros com updated_at > 5 anos.
// - pacientes_deletados: remove registros com prontuário (updated_at) > 20 anos.
func StartWorker(db *gorm.DB) {
	if db == nil {
		return
	}
	intervalDays := defaultIntervalDays
	if s := strings.TrimSpace(os.Getenv("RETENTION_INTERVAL_DAYS")); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v > 0 {
			intervalDays = v
		}
	}
	runOnStart := true
	if s := strings.TrimSpace(os.Getenv("RETENTION_RUN_ON_START")); s != "" {
		runOnStart = strings.EqualFold(s, "true")
	}

	if runOnStart {
		if _, err := RunNow(db); err != nil {
			log.Printf("retention worker: erro na execução inicial: %v", err)
		}
	}

	go func() {
		ticker := time.NewTicker(time.Duration(intervalDays) * 24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			if _, err := RunNow(db); err != nil {
				log.Printf("retention worker: erro na execução agendada: %v", err)
			}
		}
	}()
	log.Printf("retention worker iniciado (intervalo=%d dias, run_on_start=%v)", intervalDays, runOnStart)
}

// RunNow executa o ciclo de retenção sob demanda.
func RunNow(db *gorm.DB) (RunReport, error) {
	report := RunReport{ExecutedAt: time.Now()}
	now := time.Now()
	cutoffAudit := now.AddDate(-5, 0, 0)
	cutoffPacientesDeletados := now.AddDate(-20, 0, 0)
	report.CutoffAuditLogs = cutoffAudit.Format("2006-01-02")
	report.CutoffPacientesDeletados = cutoffPacientesDeletados.Format("2006-01-02")

	resAudit := db.Where("updated_at < ?", cutoffAudit).Delete(&models.AuditLog{})
	if resAudit.Error != nil {
		return report, resAudit.Error
	} else if resAudit.RowsAffected > 0 {
		report.AuditLogsDeleted = resAudit.RowsAffected
		log.Printf("retention worker: audit_logs removidos=%d (cutoff=%s)", resAudit.RowsAffected, cutoffAudit.Format("2006-01-02"))
	}

	exists, err := tableExists(db, "pacientes_deletados")
	if err != nil {
		return report, err
	}
	if !exists {
		return report, nil
	}

	resPac := db.Exec("DELETE FROM pacientes_deletados WHERE updated_at < ?", cutoffPacientesDeletados)
	if resPac.Error != nil {
		return report, resPac.Error
	}
	if resPac.RowsAffected > 0 {
		report.PacientesDeletadosDeleted = resPac.RowsAffected
		log.Printf("retention worker: pacientes_deletados removidos=%d (cutoff=%s)", resPac.RowsAffected, cutoffPacientesDeletados.Format("2006-01-02"))
	}
	return report, nil
}

func tableExists(db *gorm.DB, table string) (bool, error) {
	var regclass *string
	err := db.Raw("SELECT to_regclass(?)", "public."+table).Scan(&regclass).Error
	if err != nil {
		return false, err
	}
	return regclass != nil && *regclass != "", nil
}

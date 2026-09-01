{{/*
Expand the namespace for all resources.
*/}}
{{- define "krp.namespace" -}}
{{- .Values.namespace | default "krp" }}
{{- end }}

{{/*
Chart labels applied to resources.
*/}}
{{- define "krp.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
PostgreSQL image reference.
*/}}
{{- define "krp.postgres.image" -}}
{{- printf "%s:%s" .Values.postgres.image.repository .Values.postgres.image.tag }}
{{- end }}

{{/*
PostgreSQL PVC claim name (existing claim or Helm-created postgres-data).
*/}}
{{- define "krp.postgres.claimName" -}}
{{- if .Values.postgres.storage.existingClaim -}}
{{- .Values.postgres.storage.existingClaim -}}
{{- else -}}
postgres-data
{{- end -}}
{{- end }}

{{/*
Application image references.
*/}}
{{- define "krp.userService.image" -}}
{{- printf "%s:%s" .Values.images.userService.repository .Values.images.userService.tag }}
{{- end }}

{{- define "krp.orderService.image" -}}
{{- printf "%s:%s" .Values.images.orderService.repository .Values.images.orderService.tag }}
{{- end }}

{{- define "krp.paymentService.image" -}}
{{- printf "%s:%s" .Values.images.paymentService.repository .Values.images.paymentService.tag }}
{{- end }}

{{/*
Prometheus image reference.
*/}}
{{- define "krp.prometheus.image" -}}
{{- printf "%s:%s" .Values.prometheus.image.repository .Values.prometheus.image.tag }}
{{- end }}

{{/*
Grafana image reference.
*/}}
{{- define "krp.grafana.image" -}}
{{- printf "%s:%s" .Values.grafana.image.repository .Values.grafana.image.tag }}
{{- end }}

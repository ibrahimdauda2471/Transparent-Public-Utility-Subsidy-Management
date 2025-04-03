;; Usage Monitoring Contract
;; This contract tracks consumption patterns of subsidy recipients

(define-data-var admin principal tx-sender)

;; Data structure for usage records
(define-map usage-records
  { recipient: principal, period: uint }
  {
    electricity-usage: uint,
    water-usage: uint,
    gas-usage: uint,
    timestamp: uint
  }
)

;; Usage thresholds for monitoring
(define-data-var electricity-threshold uint u500) ;; kWh
(define-data-var water-threshold uint u15000)     ;; Liters
(define-data-var gas-threshold uint u100)         ;; Cubic meters

;; Error codes
(define-constant ERR-NOT-ADMIN (err u100))
(define-constant ERR-RECORD-EXISTS (err u101))
(define-constant ERR-RECORD-NOT-FOUND (err u102))

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Update admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (ok (var-set admin new-admin))
  )
)

;; Record utility usage for a recipient
(define-public (record-usage
  (recipient principal)
  (period uint)
  (electricity uint)
  (water uint)
  (gas uint))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (asserts! (is-none (map-get? usage-records {recipient: recipient, period: period})) ERR-RECORD-EXISTS)

    (map-set usage-records
      {recipient: recipient, period: period}
      {
        electricity-usage: electricity,
        water-usage: water,
        gas-usage: gas,
        timestamp: block-height
      }
    )
    (ok true)
  )
)

;; Update existing usage record
(define-public (update-usage
  (recipient principal)
  (period uint)
  (electricity uint)
  (water uint)
  (gas uint))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (asserts! (is-some (map-get? usage-records {recipient: recipient, period: period})) ERR-RECORD-NOT-FOUND)

    (map-set usage-records
      {recipient: recipient, period: period}
      {
        electricity-usage: electricity,
        water-usage: water,
        gas-usage: gas,
        timestamp: block-height
      }
    )
    (ok true)
  )
)

;; Check if usage exceeds thresholds
(define-read-only (check-excessive-usage (recipient principal) (period uint))
  (match (map-get? usage-records {recipient: recipient, period: period})
    usage-data
    (ok {
      excessive-electricity: (> (get electricity-usage usage-data) (var-get electricity-threshold)),
      excessive-water: (> (get water-usage usage-data) (var-get water-threshold)),
      excessive-gas: (> (get gas-usage usage-data) (var-get gas-threshold))
    })
    (err ERR-RECORD-NOT-FOUND)
  )
)

;; Get usage record
(define-read-only (get-usage-record (recipient principal) (period uint))
  (map-get? usage-records {recipient: recipient, period: period})
)

;; Update usage thresholds
(define-public (update-thresholds
  (new-electricity-threshold uint)
  (new-water-threshold uint)
  (new-gas-threshold uint))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (var-set electricity-threshold new-electricity-threshold)
    (var-set water-threshold new-water-threshold)
    (var-set gas-threshold new-gas-threshold)
    (ok true)
  )
)

;; Get current thresholds
(define-read-only (get-thresholds)
  {
    electricity-threshold: (var-get electricity-threshold),
    water-threshold: (var-get water-threshold),
    gas-threshold: (var-get gas-threshold)
  }
)


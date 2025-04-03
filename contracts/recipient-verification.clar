;; Recipient Verification Contract
;; This contract validates eligibility for utility assistance

(define-data-var admin principal tx-sender)

;; Data structure for recipients
(define-map recipients
  { address: principal }
  {
    is-eligible: bool,
    income-level: uint,
    household-size: uint,
    last-verified: uint
  }
)

;; Eligibility criteria
(define-data-var income-threshold uint u50000)
(define-data-var household-multiplier uint u10000)
(define-data-var verification-period uint u31536000) ;; 1 year in seconds

;; Error codes
(define-constant ERR-NOT-ADMIN (err u100))
(define-constant ERR-ALREADY-REGISTERED (err u101))
(define-constant ERR-NOT-REGISTERED (err u102))
(define-constant ERR-VERIFICATION-EXPIRED (err u103))

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

;; Register a new recipient
(define-public (register-recipient
  (recipient-address principal)
  (income uint)
  (household-size uint))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (asserts! (is-none (map-get? recipients {address: recipient-address})) ERR-ALREADY-REGISTERED)

    (map-set recipients
      {address: recipient-address}
      {
        is-eligible: (calculate-eligibility income household-size),
        income-level: income,
        household-size: household-size,
        last-verified: block-height
      }
    )
    (ok true)
  )
)

;; Update recipient information
(define-public (update-recipient
  (recipient-address principal)
  (income uint)
  (household-size uint))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (asserts! (is-some (map-get? recipients {address: recipient-address})) ERR-NOT-REGISTERED)

    (map-set recipients
      {address: recipient-address}
      {
        is-eligible: (calculate-eligibility income household-size),
        income-level: income,
        household-size: household-size,
        last-verified: block-height
      }
    )
    (ok true)
  )
)

;; Remove a recipient
(define-public (remove-recipient (recipient-address principal))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (asserts! (is-some (map-get? recipients {address: recipient-address})) ERR-NOT-REGISTERED)

    (map-delete recipients {address: recipient-address})
    (ok true)
  )
)

;; Check if a recipient is eligible
(define-read-only (is-recipient-eligible (recipient-address principal))
  (let (
    (recipient-data (map-get? recipients {address: recipient-address}))
  )
    (if (is-none recipient-data)
      (err ERR-NOT-REGISTERED)
      (let (
        (data (unwrap-panic recipient-data))
        (verification-valid (< (- block-height (get last-verified data)) (var-get verification-period)))
      )
        (if verification-valid
          (ok (get is-eligible data))
          (err ERR-VERIFICATION-EXPIRED)
        )
      )
    )
  )
)

;; Calculate eligibility based on income and household size
(define-private (calculate-eligibility (income uint) (household-size uint))
  (let (
    (adjusted-threshold (+ (var-get income-threshold) (* household-size (var-get household-multiplier))))
  )
    (<= income adjusted-threshold)
  )
)

;; Update eligibility criteria
(define-public (update-eligibility-criteria
  (new-income-threshold uint)
  (new-household-multiplier uint))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (var-set income-threshold new-income-threshold)
    (var-set household-multiplier new-household-multiplier)
    (ok true)
  )
)

;; Get recipient data
(define-read-only (get-recipient-data (recipient-address principal))
  (map-get? recipients {address: recipient-address})
)


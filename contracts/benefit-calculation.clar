;; Benefit Calculation Contract
;; This contract determines appropriate subsidy amounts

(define-data-var admin principal tx-sender)

;; Benefit calculation parameters
(define-data-var base-subsidy uint u100)
(define-data-var income-factor uint u10)  ;; Percentage reduction per 10000 income
(define-data-var household-bonus uint u25) ;; Additional amount per household member
(define-data-var max-subsidy uint u500)

;; Error codes
(define-constant ERR-NOT-ADMIN (err u100))

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

;; Calculate subsidy amount based on income and household size
(define-read-only (calculate-subsidy (income uint) (household-size uint))
  (let (
    (income-reduction (/ (* income (var-get income-factor)) u10000))
    (household-addition (* household-size (var-get household-bonus)))
    (initial-subsidy (- (var-get base-subsidy) income-reduction))
    (adjusted-subsidy (+ initial-subsidy household-addition))
  )
    (if (> adjusted-subsidy (var-get max-subsidy))
      (var-get max-subsidy)
      (if (< adjusted-subsidy u0)
        u0
        adjusted-subsidy
      )
    )
  )
)

;; Update benefit calculation parameters
(define-public (update-calculation-parameters
  (new-base-subsidy uint)
  (new-income-factor uint)
  (new-household-bonus uint)
  (new-max-subsidy uint))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (var-set base-subsidy new-base-subsidy)
    (var-set income-factor new-income-factor)
    (var-set household-bonus new-household-bonus)
    (var-set max-subsidy new-max-subsidy)
    (ok true)
  )
)

;; Get current calculation parameters
(define-read-only (get-calculation-parameters)
  {
    base-subsidy: (var-get base-subsidy),
    income-factor: (var-get income-factor),
    household-bonus: (var-get household-bonus),
    max-subsidy: (var-get max-subsidy)
  }
)


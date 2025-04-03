import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract functions
const mockRecipients = new Map()
let mockAdmin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
let mockBlockHeight = 100
let mockIncomeThreshold = 50000
let mockHouseholdMultiplier = 10000
let mockVerificationPeriod = 31536000

// Mock contract functions
const contractFunctions = {
  "is-admin": () => mockAdmin === "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "set-admin": (newAdmin) => {
    if (contractFunctions["is-admin"]()) {
      mockAdmin = newAdmin
      return { value: true }
    }
    return { error: 100 }
  },
  "register-recipient": (address, income, householdSize) => {
    if (!contractFunctions["is-admin"]()) {
      return { error: 100 }
    }
    
    if (mockRecipients.has(address)) {
      return { error: 101 }
    }
    
    const isEligible = income <= mockIncomeThreshold + householdSize * mockHouseholdMultiplier
    
    mockRecipients.set(address, {
      "is-eligible": isEligible,
      "income-level": income,
      "household-size": householdSize,
      "last-verified": mockBlockHeight,
    })
    
    return { value: true }
  },
  "update-recipient": (address, income, householdSize) => {
    if (!contractFunctions["is-admin"]()) {
      return { error: 100 }
    }
    
    if (!mockRecipients.has(address)) {
      return { error: 102 }
    }
    
    const isEligible = income <= mockIncomeThreshold + householdSize * mockHouseholdMultiplier
    
    mockRecipients.set(address, {
      "is-eligible": isEligible,
      "income-level": income,
      "household-size": householdSize,
      "last-verified": mockBlockHeight,
    })
    
    return { value: true }
  },
  "remove-recipient": (address) => {
    if (!contractFunctions["is-admin"]()) {
      return { error: 100 }
    }
    
    if (!mockRecipients.has(address)) {
      return { error: 102 }
    }
    
    mockRecipients.delete(address)
    return { value: true }
  },
  "is-recipient-eligible": (address) => {
    if (!mockRecipients.has(address)) {
      return { error: 102 }
    }
    
    const recipient = mockRecipients.get(address)
    const verificationValid = mockBlockHeight - recipient["last-verified"] < mockVerificationPeriod
    
    if (!verificationValid) {
      return { error: 103 }
    }
    
    return { value: recipient["is-eligible"] }
  },
  "update-eligibility-criteria": (newIncomeThreshold, newHouseholdMultiplier) => {
    if (!contractFunctions["is-admin"]()) {
      return { error: 100 }
    }
    
    mockIncomeThreshold = newIncomeThreshold
    mockHouseholdMultiplier = newHouseholdMultiplier
    
    return { value: true }
  },
  "get-recipient-data": (address) => {
    return mockRecipients.has(address) ? mockRecipients.get(address) : null
  },
}

describe("Recipient Verification Contract", () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockRecipients.clear()
    mockAdmin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockBlockHeight = 100
    mockIncomeThreshold = 50000
    mockHouseholdMultiplier = 10000
    mockVerificationPeriod = 31536000
  })
  
  it("should register a new recipient", () => {
    const result = contractFunctions["register-recipient"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 40000, 3)
    expect(result.value).toBe(true)
    
    const recipientData = contractFunctions["get-recipient-data"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
    expect(recipientData).not.toBeNull()
    expect(recipientData["is-eligible"]).toBe(true)
    expect(recipientData["income-level"]).toBe(40000)
    expect(recipientData["household-size"]).toBe(3)
  })
  
  it("should not register a recipient if not admin", () => {
    mockAdmin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const result = contractFunctions["register-recipient"]("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7WF3G8", 40000, 3)
    expect(result.error).toBe(100)
  })
  
  it("should not register a recipient twice", () => {
    contractFunctions["register-recipient"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 40000, 3)
    const result = contractFunctions["register-recipient"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 45000, 2)
    expect(result.error).toBe(101)
  })
  
  it("should update a recipient", () => {
    contractFunctions["register-recipient"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 40000, 3)
    const result = contractFunctions["update-recipient"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 45000, 4)
    expect(result.value).toBe(true)
    
    const recipientData = contractFunctions["get-recipient-data"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
    expect(recipientData["income-level"]).toBe(45000)
    expect(recipientData["household-size"]).toBe(4)
  })
  
  it("should remove a recipient", () => {
    contractFunctions["register-recipient"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 40000, 3)
    const result = contractFunctions["remove-recipient"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
    expect(result.value).toBe(true)
    
    const recipientData = contractFunctions["get-recipient-data"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
    expect(recipientData).toBeNull()
  })
  
  it("should check eligibility correctly", () => {
    // Eligible recipient (income below threshold)
    contractFunctions["register-recipient"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 40000, 3)
    let result = contractFunctions["is-recipient-eligible"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
    expect(result.value).toBe(true)
    
    // Ineligible recipient (income above threshold)
    contractFunctions["register-recipient"]("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7WF3G8", 90000, 2)
    result = contractFunctions["is-recipient-eligible"]("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7WF3G8")
    expect(result.value).toBe(false)
  })
  
  it("should update eligibility criteria", () => {
    const result = contractFunctions["update-eligibility-criteria"](60000, 15000)
    expect(result.value).toBe(true)
    
    // Test with new criteria
    contractFunctions["register-recipient"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 70000, 2)
    const eligibility = contractFunctions["is-recipient-eligible"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
    expect(eligibility.value).toBe(true) // Should be eligible with new higher threshold
  })
  
  it("should check verification expiration", () => {
    contractFunctions["register-recipient"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 40000, 3)
    
    // Fast forward block height beyond verification period
    mockBlockHeight = mockBlockHeight + mockVerificationPeriod + 1
    
    const result = contractFunctions["is-recipient-eligible"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
    expect(result.error).toBe(103) // Verification expired
  })
})


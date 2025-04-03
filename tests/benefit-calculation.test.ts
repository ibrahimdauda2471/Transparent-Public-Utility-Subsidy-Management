import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract functions
let mockAdmin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
let mockBaseSubsidy = 100
let mockIncomeFactor = 10
let mockHouseholdBonus = 25
let mockMaxSubsidy = 500

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
  "calculate-subsidy": (income, householdSize) => {
    const incomeReduction = Math.floor((income * mockIncomeFactor) / 10000)
    const householdAddition = householdSize * mockHouseholdBonus
    let adjustedSubsidy = mockBaseSubsidy - incomeReduction + householdAddition
    
    if (adjustedSubsidy > mockMaxSubsidy) {
      adjustedSubsidy = mockMaxSubsidy
    }
    
    if (adjustedSubsidy < 0) {
      adjustedSubsidy = 0
    }
    
    return adjustedSubsidy
  },
  "update-calculation-parameters": (newBaseSubsidy, newIncomeFactor, newHouseholdBonus, newMaxSubsidy) => {
    if (!contractFunctions["is-admin"]()) {
      return { error: 100 }
    }
    
    mockBaseSubsidy = newBaseSubsidy
    mockIncomeFactor = newIncomeFactor
    mockHouseholdBonus = newHouseholdBonus
    mockMaxSubsidy = newMaxSubsidy
    
    return { value: true }
  },
  "get-calculation-parameters": () => {
    return {
      "base-subsidy": mockBaseSubsidy,
      "income-factor": mockIncomeFactor,
      "household-bonus": mockHouseholdBonus,
      "max-subsidy": mockMaxSubsidy,
    }
  },
}

describe("Benefit Calculation Contract", () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockAdmin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockBaseSubsidy = 100
    mockIncomeFactor = 10
    mockHouseholdBonus = 25
    mockMaxSubsidy = 500
  })
  
  it("should calculate subsidy correctly for low income", () => {
    const subsidy = contractFunctions["calculate-subsidy"](20000, 2)
    // Expected: 100 - (20000 * 10 / 10000) + (2 * 25) = 100 - 20 + 50 = 130
    expect(subsidy).toBe(130)
  })
  
  it("should calculate subsidy correctly for high income", () => {
    const subsidy = contractFunctions["calculate-subsidy"](80000, 1)
    // Expected: 100 - (80000 * 10 / 10000) + (1 * 25) = 100 - 80 + 25 = 45
    expect(subsidy).toBe(45)
  })
  
  it("should cap subsidy at maximum value", () => {
    const subsidy = contractFunctions["calculate-subsidy"](10000, 20)
    // Expected: 100 - (10000 * 10 / 10000) + (20 * 25) = 100 - 10 + 500 = 590
    // But capped at max subsidy of 500
    expect(subsidy).toBe(500)
  })
  
  it("should not return negative subsidy", () => {
    const subsidy = contractFunctions["calculate-subsidy"](150000, 1)
    // Expected: 100 - (150000 * 10 / 10000) + (1 * 25) = 100 - 150 + 25 = -25
    // But minimum is 0
    expect(subsidy).toBe(0)
  })
  
  it("should update calculation parameters", () => {
    const result = contractFunctions["update-calculation-parameters"](200, 15, 30, 600)
    expect(result.value).toBe(true)
    
    const params = contractFunctions["get-calculation-parameters"]()
    expect(params["base-subsidy"]).toBe(200)
    expect(params["income-factor"]).toBe(15)
    expect(params["household-bonus"]).toBe(30)
    expect(params["max-subsidy"]).toBe(600)
    
    // Test calculation with new parameters
    const subsidy = contractFunctions["calculate-subsidy"](20000, 2)
    // Expected: 200 - (20000 * 15 / 10000) + (2 * 30) = 200 - 30 + 60 = 230
    expect(subsidy).toBe(230)
  })
  
  it("should not update parameters if not admin", () => {
    mockAdmin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const result = contractFunctions["update-calculation-parameters"](200, 15, 30, 600)
    expect(result.error).toBe(100)
    
    // Parameters should remain unchanged
    const params = contractFunctions["get-calculation-parameters"]()
    expect(params["base-subsidy"]).toBe(100)
  })
})


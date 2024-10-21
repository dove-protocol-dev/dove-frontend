const NONE_LTV = 0.001;
const CONSERVATIVE_LTV = 0.26;
const MODERATE_LTV = 0.4;
const AGGRESSIVE_LTV = 0.7;
const MAX_LTV = 0.8;

export default class Position {
    public readonly collateral: number;
    public readonly debt: number;
    public readonly maxLtv: number;
    public readonly borrowCapacity: number;
    public readonly availableToBorrow: number;
    public readonly availableToWithdraw: number;
    public readonly liquidationPoint: number;
    public readonly hasNegligibleCollateral: boolean;
    public readonly hasNegligibleDebt: boolean;
    public readonly loanToValueRatio: number;
    public readonly riskLevel: string;
    public readonly maxCollateralDropPercentageBeforeLiquidation: number;

    public static readonly ZERO = new Position(0, 0);

    private calculateLoanToValueRatio(): number {
        if (this.collateral === 0) {
            return this.hasNegligibleDebt ? 0 : Infinity;
        }
        return this.debt / this.collateral;
    }

    private calculateRiskLevel(): string {
        if (this.loanToValueRatio < NONE_LTV) return "None";
        if (this.loanToValueRatio < CONSERVATIVE_LTV) return "Conservative";
        if (this.loanToValueRatio < MODERATE_LTV) return "Moderate";
        if (this.loanToValueRatio < AGGRESSIVE_LTV) return "Aggressive";
        return "Liquidation";
    }

    private calculateMaxCollateralDropPercentage(): number {
        if (this.collateral === 0) return 0;
        const dropPercentage = (1 - this.liquidationPoint / this.collateral) * 100;
        return Math.max(0, dropPercentage);
    }

    constructor(collateral: number, debt: number) {
        collateral = Math.max(0, collateral);
        debt = Math.max(0, debt);
        this.collateral = collateral;
        this.debt = debt;
        this.maxLtv = MAX_LTV;
        this.borrowCapacity = collateral * MAX_LTV;
        this.availableToBorrow = Math.max(0, this.borrowCapacity - this.debt);
        this.availableToWithdraw = Math.max(0, this.collateral - this.debt / MAX_LTV);
        this.liquidationPoint = this.debt / MAX_LTV;
        this.hasNegligibleCollateral = this.collateral < 0.01;
        this.hasNegligibleDebt = this.debt < 0.01;
        this.loanToValueRatio = this.calculateLoanToValueRatio();
        this.riskLevel = this.calculateRiskLevel();
        this.maxCollateralDropPercentageBeforeLiquidation =
            this.calculateMaxCollateralDropPercentage();
    }

    withCollateral(collateral: number): Position {
        return new Position(collateral, this.debt);
    }

    withDebt(debt: number): Position {
        return new Position(this.collateral, debt);
    }
}

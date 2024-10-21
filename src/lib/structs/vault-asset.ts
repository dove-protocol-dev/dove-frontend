import { Asset } from "./asset";

export class VaultAsset extends Asset {
    price?: number;
    userBalance?: number;
    vaultBalance?: number;
    public constructor({
        asset,
        price,
        userBalance,
        vaultBalance
    }: {
        asset: Asset;
        price?: number;
        userBalance?: number;
        vaultBalance?: number;
    }) {
        super({
            name: asset.name,
            symbol: asset.symbol,
            icon: asset.icon,
            mint: asset.mint,
            debugPrice: asset.debugPrice,
            isNative: asset.isNative
        });
        this.price = price;
        this.userBalance = userBalance;
        this.vaultBalance = vaultBalance;
    }
}

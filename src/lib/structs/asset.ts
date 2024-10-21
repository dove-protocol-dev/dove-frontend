import { Keypair, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { DEBUG } from "../constants";
import { Hashable } from "./hash-map";

export class Asset implements Hashable {
    public readonly name: string;
    public readonly symbol: string;
    public readonly icon: string;
    public readonly mint: PublicKey;
    public readonly debugPrice: number;
    public readonly debugKeypair: Keypair | undefined;
    public readonly isNative: boolean;

    constructor({
        name,
        symbol,
        icon,
        mint,
        debugPrice,
        isNative
    }: {
        name: string;
        symbol: string;
        icon: string;
        mint: PublicKey;
        debugPrice: number;
        isNative: boolean;
    }) {
        const debugKeypair =
            DEBUG && !isNative ? Keypair.fromSeed(Buffer.alloc(32, symbol)) : undefined;
        this.name = name;
        this.symbol = symbol;
        this.icon = icon;
        this.mint = debugKeypair?.publicKey || mint;
        this.debugPrice = debugPrice;
        this.isNative = isNative;
        this.debugKeypair = debugKeypair;
    }

    public getHashCode() {
        return this.symbol;
    }

    public static readonly LIST: Asset[] = [
        new Asset({
            name: "Solana",
            symbol: "SOL",
            icon: "icons/solana.svg",
            mint: NATIVE_MINT,
            debugPrice: 159.23,
            isNative: true
        }),
        new Asset({
            name: "Helium",
            symbol: "HNT",
            icon: "icons/helium.svg",
            mint: new PublicKey("hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux"),
            debugPrice: 7.495,
            isNative: false
        }),
        new Asset({
            name: "Pyth Network",
            symbol: "PYTH",
            icon: "icons/pyth.svg",
            mint: new PublicKey("HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3"),
            debugPrice: 0.3566,
            isNative: false
        }),
        new Asset({
            name: "Jupiter",
            symbol: "JUP",
            icon: "icons/jupiter.svg",
            mint: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"),
            debugPrice: 0.8971,
            isNative: false
        }),
        new Asset({
            name: "Render",
            symbol: "RENDER",
            icon: "icons/render.svg",
            mint: new PublicKey("rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof"),
            debugPrice: 6.427,
            isNative: false
        })
    ];

    public static readonly NOTHING = new Asset({
        name: "Nothing",
        symbol: "NOTHING",
        icon: "icons/nothing.svg",
        mint: new PublicKey("11111111111111111111111111111111"),
        debugPrice: 0,
        isNative: false
    });

    public static byMint(mint: PublicKey): Asset | undefined {
        return this.LIST.find((c) => c.mint.equals(mint));
    }

    public toString(): string {
        return `Asset{${this.name} ${this.symbol} ${this.mint.toBase58()} ${this.debugPrice} ${this.isNative}}`;
    }
}

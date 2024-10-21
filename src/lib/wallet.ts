import { SendTransactionOptions } from "@solana/wallet-adapter-base";
import {
    Connection,
    PublicKey,
    Transaction,
    VersionedTransaction
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { lamportsToSol, solToLamports, unwrap } from "./utils";
import {
    Account,
    getAssociatedTokenAddressSync,
    Mint,
    TOKEN_PROGRAM_ID,
    unpackAccount,
    unpackMint
} from "@solana/spl-token";

export class Wallet {
    public readonly connected: boolean;
    public readonly connection: Connection;
    public readonly pubkey?: PublicKey;

    public readonly contextState: WalletContextState;
    public readonly setShowModal: (show: boolean) => void;

    constructor(
        contextState: WalletContextState,
        connection: Connection,
        setShowModal: (show: boolean) => void
    ) {
        const { publicKey, connected } = contextState;
        this.connected = connected;
        this.connection = connection;
        this.pubkey = publicKey || undefined;
        this.contextState = contextState;
        this.setShowModal = setShowModal;
    }

    private async confirmTransaction(signature: string, lastValidBlockHeight: number) {
        if (!this.connection) {
            throw new Error("No connection");
        }
        while (true) {
            const [status, blockHeight] = await Promise.all([
                this.connection.getSignatureStatus(signature),
                this.connection.getBlockHeight()
            ]);
            if (blockHeight > lastValidBlockHeight) {
                throw new Error("Transaction expired (block height exceeded)");
            }
            const err = status.value?.err;
            if (err) {
                throw new Error("Transaction failed: " + err);
            }
            if (status.value?.confirmationStatus === "confirmed") {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    async requestAirdrop(pubkey: PublicKey, amount: number): Promise<string> {
        if (!this.connection) {
            throw new Error("No connection");
        }
        const { lastValidBlockHeight } = await this.connection.getLatestBlockhash();
        const signature = await this.connection.requestAirdrop(
            pubkey,
            solToLamports(amount)
        );
        await this.confirmTransaction(signature, lastValidBlockHeight);
        return signature;
    }

    async getAccountData(pubkey: PublicKey): Promise<Buffer | null> {
        if (!this.connection) {
            throw new Error("No connection");
        }
        const accountInfo = await this.connection.getAccountInfo(pubkey);
        if (!accountInfo) {
            return null;
        }
        return accountInfo.data;
    }

    async getMint(mint: PublicKey): Promise<Mint | null> {
        const info = await this.connection.getAccountInfo(mint);
        if (!info) {
            return null;
        }
        return unpackMint(mint, info);
    }

    async getAssociatedTokenAccount(mint: PublicKey): Promise<Account | null> {
        if (!this.pubkey) {
            return null;
        }
        const address = getAssociatedTokenAddressSync(mint, this.pubkey);
        const info = await this.connection.getAccountInfo(address);
        if (!info) {
            return null;
        }
        return unpackAccount(address, info);
    }

    async getAccountBalance(pubkey: PublicKey): Promise<number> {
        if (!this.connection) {
            throw new Error("No connection");
        }
        const balance = await this.connection.getAccountInfo(pubkey);
        return lamportsToSol(balance?.lamports || 0);
    }

    async sendAndConfirmTransaction(
        transaction: Transaction | VersionedTransaction,
        options?: SendTransactionOptions,
        lastValidBlockHeight?: number,
        recentBlockhash?: string
    ): Promise<string> {
        const connection = unwrap(this.connection, "No connection");
        const signTransaction = unwrap(
            this.contextState.signTransaction,
            "No signTransaction function"
        );
        const pubkey = unwrap(this.pubkey, "No pubkey");

        if (!lastValidBlockHeight || !recentBlockhash) {
            const resp = await connection.getLatestBlockhash();
            lastValidBlockHeight = resp.lastValidBlockHeight;
            recentBlockhash = resp.blockhash;
        }
        if (transaction instanceof Transaction) {
            transaction.recentBlockhash = recentBlockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            if (!transaction.feePayer) {
                transaction.feePayer = pubkey;
            }
        } else {
            transaction.message.recentBlockhash = recentBlockhash;
        }

        const signers = options?.signers || [];
        if (signers.length > 0) {
            (transaction.sign as Function)(...signers);
        }

        transaction = await signTransaction(transaction);
        const rawTransaction = transaction.serialize();
        const signature = await connection.sendRawTransaction(rawTransaction, options);
        await this.confirmTransaction(signature, lastValidBlockHeight);
        return signature;
    }
}

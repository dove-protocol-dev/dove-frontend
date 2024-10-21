"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOVE_PROGRAM_ID } from "@/lib/constants";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useMemo } from "react";
import { Authority } from "../../../pkg/dove";
import { useWallet } from "@/components/providers/wallet-provider";
import { useDove } from "@/components/providers/dove-provider";
import { unwrap } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCache } from "@/components/providers/cache-provider";
import WorldCache from "@/lib/cache/world-cache";
import { useLedger } from "@/components/providers/ledger-provider";
import AuthorityCache from "@/lib/cache/authority-cache";
import { Asset } from "@/lib/structs/asset";
import CollateralCache from "@/lib/cache/collateral-cache";
import DvdCache from "@/lib/cache/dvd-cache";
import DoveCache from "@/lib/cache/dove-cache";
import StabilityCache from "@/lib/cache/stability-cache";
import Stablecoin from "@/lib/structs/stablecoin";
import StablecoinCache from "@/lib/cache/stablecoin-cache";

export default function Debug() {
    const wallet = useWallet();
    const dove = useDove();
    const ledger = useLedger();

    const [worldCache, worldError] = useCache(WorldCache, []);
    const [authorityCache, authorityError] = useCache(AuthorityCache, []);
    const [collateralCache, collateralError] = useCache(CollateralCache, []);
    const [dvdCache, dvdError] = useCache(DvdCache, [worldCache]);
    const [doveCache, doveError] = useCache(DoveCache, [worldCache]);
    const [stabilityCache, stabilityError] = useCache(StabilityCache, [worldCache]);
    const [stablecoinCache, stablecoinError] = useCache(StablecoinCache, []);

    const cacheError =
        worldError ||
        authorityError ||
        collateralError ||
        dvdError ||
        doveError ||
        stabilityError ||
        stablecoinError;

    const [dvdMint, setDvdMint] = useState<PublicKey | null>(null);
    const [doveMint, setDoveMint] = useState<PublicKey | null>(null);
    useEffect(() => {
        const { world } = worldCache || {};
        if (!world) return;
        setDoveMint(new PublicKey(world.dove.mint));
        setDvdMint(new PublicKey(world.dvd.mint));
    }, [worldCache]);

    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [airdropAmount, setAirdropAmount] = useState<number>(5);
    function updateWalletBalance() {
        if (!wallet.pubkey) {
            return;
        }
        wallet.getAccountBalance(wallet.pubkey).then(setWalletBalance);
    }
    useEffect(updateWalletBalance, [wallet.connected]);

    const [createMetadata, setCreateMetadata] = useState<boolean>(false);

    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<string>("");

    const authorityKey = useMemo<PublicKey | null>(() => {
        if (!dove.initialized) return null;
        return new PublicKey(Authority.deriveKey(DOVE_PROGRAM_ID.toBuffer())!);
    }, [dove.initialized]);

    async function createDvdMint() {
        setLoading("Creating DVD Mint...");
        setError("");
        const authority = unwrap(authorityKey, "Authority key not found");
        const pubkey = unwrap(wallet.pubkey, "Wallet not connected");
        try {
            const mint = await ledger.createMint({
                name: "Dove USD",
                symbol: "DVD",
                decimals: 9,
                initialSupply: 0,
                mintAuthority: authority,
                freezeAuthority: null,
                updateAuthority: pubkey,
                createMetadata: createMetadata,
                metadataUrl: ""
            });
            setDvdMint(mint);
        } catch (e: any) {
            console.error(e);
            setError(e.toString());
        } finally {
            setLoading("");
        }
        updateWalletBalance();
    }

    async function createDoveMint() {
        setLoading("Creating DOVE Mint...");
        setError("");
        const authority = unwrap(authorityKey, "Authority key not found");
        const pubkey = unwrap(wallet.pubkey, "Wallet not connected");
        try {
            const mint = await ledger.createMint({
                name: "Dove",
                symbol: "DOVE",
                decimals: 9,
                initialSupply: 0,
                mintAuthority: authority,
                freezeAuthority: null,
                updateAuthority: pubkey,
                createMetadata: createMetadata,
                metadataUrl: ""
            });
            setDoveMint(mint);
        } catch (e: any) {
            console.error(e);
            setError(e.toString());
        } finally {
            setLoading("");
        }
        updateWalletBalance();
    }

    async function createWorld() {
        if (!dvdMint || !doveMint) {
            setError("DVD and DOVE mints must be created first");
            return;
        }
        setLoading("Creating World...");
        setError("");
        try {
            await ledger.createWorld(dvdMint, doveMint);
        } catch (e: any) {
            console.error(e);
            setError(e.toString());
        } finally {
            setLoading("");
        }
        updateWalletBalance();
    }

    async function requestAirdrop() {
        if (!wallet.pubkey) {
            setError("Wallet not connected");
            return;
        }
        setLoading("Requesting Airdrop...");
        setError("");
        try {
            await wallet.requestAirdrop(wallet.pubkey, airdropAmount);
            updateWalletBalance();
        } catch (e: any) {
            console.error(e);
            setError(e.toString());
        } finally {
            setLoading("");
        }
    }

    async function createAuthority() {
        setLoading("Creating Authority...");
        setError("");
        try {
            await ledger.createAuthority();
        } catch (e: any) {
            console.error(e);
            setError(e.toString());
        } finally {
            setLoading("");
        }
    }

    const createCollateralFunctions = Asset.LIST.map((asset, index) => {
        return async function () {
            setLoading(`Creating ${asset.name} Collateral...`);
            setError("");
            try {
                if (
                    asset.debugKeypair &&
                    !(await wallet.getAccountData(asset.mint))?.length
                ) {
                    await ledger.createMint({
                        name: asset.name,
                        symbol: asset.symbol,
                        decimals: 9,
                        initialSupply: Math.floor(Math.random() * 10 ** 9),
                        mintAuthority: PublicKey.default,
                        freezeAuthority: null,
                        updateAuthority: null,
                        createMetadata: false,
                        metadataUrl: "",
                        keypair: asset.debugKeypair
                    });
                }
                await ledger.createCollateral(
                    asset.mint,
                    100_000_000,
                    asset.debugPrice,
                    index
                );
                updateWalletBalance();
            } catch (e: any) {
                console.error(e);
                setError(e.toString());
            } finally {
                setLoading("");
            }
        };
    });

    const createStabilityFunctions = Stablecoin.LIST.map((stablecoin) => {
        return async function () {
            setLoading(`Creating ${stablecoin.name} Stability...`);
            setError("");
            try {
                if (
                    stablecoin.debugKeypair &&
                    !(await wallet.getAccountData(stablecoin.mint))?.length
                ) {
                    await ledger.createMint({
                        name: stablecoin.name,
                        symbol: stablecoin.symbol,
                        decimals: 9,
                        initialSupply: Math.floor(Math.random() * 10 ** 9),
                        mintAuthority: PublicKey.default,
                        freezeAuthority: null,
                        updateAuthority: null,
                        createMetadata: false,
                        metadataUrl: "",
                        keypair: stablecoin.debugKeypair
                    });
                }
                await ledger.createStability(
                    stablecoin.mint,
                    1_000 // very small initial mint limit
                );
                updateWalletBalance();
            } catch (e: any) {
                console.error(e);
                setError(e.toString());
            } finally {
                setLoading("");
            }
        };
    });

    if (!wallet.connected) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                    role="alert"
                >
                    <strong className="font-bold">Wallet not connected</strong>
                    <span className="block sm:inline">
                        {" "}
                        Please connect your wallet to use the debug page.
                    </span>
                </div>
            </div>
        );
    }

    if (!dove.initialized) {
        return <div>Loading WebAssembly...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-8">Dove System Debug</h1>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Program Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                        <strong>Program ID:</strong> {DOVE_PROGRAM_ID.toBase58()}
                    </p>
                    <p>
                        <strong>Authority Key:</strong> {authorityKey?.toBase58()}
                    </p>
                    <p>
                        <strong>Wallet Balance:</strong> {`${walletBalance || 0} SOL`}
                    </p>
                    <p>
                        <strong>Cache Error:</strong> {JSON.stringify(cacheError)}
                    </p>
                    <div className="flex items-center space-x-4">
                        <p>
                            <strong>DVD Balance:</strong>{" "}
                            <Button
                                onClick={() => {
                                    ledger.invalidate([DvdCache]);
                                }}
                                variant="link"
                                className="p-0 h-auto font-normal"
                                disabled={!dvdCache}
                            >
                                {!dvdCache && !cacheError && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {(dvdCache || cacheError) &&
                                    `${dvdCache?.balance || 0} DVD`}
                            </Button>
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <p>
                            <strong>DOVE Balance:</strong>{" "}
                            <Button
                                onClick={() => {
                                    ledger.invalidate([DoveCache]);
                                }}
                                variant="link"
                                className="p-0 h-auto font-normal"
                                disabled={!doveCache}
                            >
                                {!doveCache && !cacheError && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {(doveCache || cacheError) &&
                                    `${doveCache?.balance || 0} DOVE`}
                            </Button>
                        </p>
                    </div>
                    <p>
                        <strong>DVD Mint:</strong>{" "}
                        {dvdMint?.toBase58() || "Not created"}
                    </p>
                    <p>
                        <strong>DOVE Mint:</strong>{" "}
                        {doveMint?.toBase58() || "Not created"}
                    </p>
                </CardContent>
            </Card>
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>System Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                        <input
                            type="checkbox"
                            id="createMetadata"
                            checked={createMetadata}
                            onChange={(e) => setCreateMetadata(e.target.checked)}
                        />
                        <label
                            htmlFor="createMetadata"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Create metadata with token
                        </label>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Input
                            type="number"
                            value={airdropAmount}
                            onChange={(e) => setAirdropAmount(Number(e.target.value))}
                            min="1"
                            step="1"
                            className="w-24"
                        />
                        <Button onClick={requestAirdrop} disabled={!!loading}>
                            {loading === "Requesting Airdrop..." ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Request Airdrop
                        </Button>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button
                            onClick={createDvdMint}
                            disabled={!!dvdMint || !!loading || !!worldCache}
                        >
                            {loading === "Creating DVD Mint..." ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            1. Create DVD Mint
                        </Button>
                        <span>{dvdMint ? "✅ Created" : "❌ Not Created"}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button
                            onClick={createDoveMint}
                            disabled={!!doveMint || !!loading || !!worldCache}
                        >
                            {loading === "Creating DOVE Mint..." ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            2. Create DOVE Mint
                        </Button>
                        <span>{doveMint ? "✅ Created" : "❌ Not Created"}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button
                            onClick={createAuthority}
                            disabled={!!loading || !!authorityCache}
                        >
                            {loading === "Creating Authority..." ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            3. Create Authority
                        </Button>
                        <span>{authorityCache ? "✅ Created" : "❌ Not Created"}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button
                            onClick={createWorld}
                            disabled={
                                !dvdMint || !doveMint || !!loading || !!worldCache
                            }
                        >
                            {loading === "Creating World..." ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            4. Create World
                        </Button>
                        <span>{worldCache ? "✅ Created" : "❌ Not Created"}</span>
                    </div>
                    {Asset.LIST.map((asset, index) => (
                        <div key={asset.symbol} className="flex items-center space-x-4">
                            <Button
                                onClick={createCollateralFunctions[index]}
                                disabled={
                                    !!loading ||
                                    !worldCache ||
                                    !!collateralCache?.get(asset)
                                }
                            >
                                {loading === `Creating ${asset.name} Collateral...` ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {`${String.fromCharCode(97 + index)}. Create ${asset.name} Collateral`}
                            </Button>
                            <span>
                                {collateralCache?.get(asset)
                                    ? "✅ Created"
                                    : "❌ Not Created"}
                            </span>
                        </div>
                    ))}
                    {Stablecoin.LIST.map((stablecoin, index) => (
                        <div
                            key={stablecoin.symbol}
                            className="flex items-center space-x-4"
                        >
                            <Button
                                onClick={createStabilityFunctions[index]}
                                disabled={
                                    !!loading ||
                                    !worldCache ||
                                    !!stabilityCache?.get(stablecoin)
                                }
                            >
                                {loading ===
                                `Creating ${stablecoin.name} Stability...` ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {`${String.fromCharCode(97 + Asset.LIST.length + index)}. Create ${stablecoin.name} Stability`}
                            </Button>
                            <span>
                                {stabilityCache?.get(stablecoin)
                                    ? "✅ Created"
                                    : "❌ Not Created"}
                            </span>
                        </div>
                    ))}
                    <h3 className="text-xl font-semibold mt-6 mb-4">DVD Trading</h3>
                    {Stablecoin.LIST.map((stablecoin, index) => {
                        const stability = stabilityCache?.get(stablecoin);
                        return (
                            <div
                                key={stablecoin.symbol}
                                className="mb-4 p-4 border rounded-md"
                            >
                                <h4 className="text-lg font-medium mb-2">
                                    {stablecoin.name}
                                </h4>
                                <p>Minted: {stability?.minted.toString() || "N/A"}</p>
                                <p>
                                    Mint Limit:{" "}
                                    {stability?.mintLimit.toString() || "N/A"}
                                </p>
                                <div className="flex space-x-4 mt-2">
                                    <Input
                                        type="number"
                                        placeholder="Amount"
                                        className="w-32"
                                        id={`amount-input-${stablecoin.symbol}`}
                                    />
                                    <Button
                                        onClick={async () => {
                                            const amountInput = document.getElementById(
                                                `amount-input-${stablecoin.symbol}`
                                            ) as HTMLInputElement;
                                            const amount = Number(amountInput.value);
                                            if (amount && worldCache && dvdCache) {
                                                setLoading(
                                                    `Buying DVD with ${stablecoin.name}...`
                                                );
                                                try {
                                                    await ledger.buyDvd(
                                                        amount,
                                                        stablecoin,
                                                        worldCache.world,
                                                        dvdCache
                                                    );
                                                } catch (e: any) {
                                                    setError(e.toString());
                                                } finally {
                                                    setLoading("");
                                                }
                                            }
                                        }}
                                        disabled={
                                            !worldCache ||
                                            !stability ||
                                            !dvdCache ||
                                            !!loading
                                        }
                                    >
                                        {loading ===
                                        `Buying DVD with ${stablecoin.name}...` ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Buy DVD
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            const amountInput = document.getElementById(
                                                `amount-input-${stablecoin.symbol}`
                                            ) as HTMLInputElement;
                                            const amount = Number(amountInput.value);
                                            if (
                                                amount &&
                                                worldCache &&
                                                stablecoinCache
                                            ) {
                                                setLoading(
                                                    `Selling DVD for ${stablecoin.name}...`
                                                );
                                                try {
                                                    await ledger.sellDvd(
                                                        amount,
                                                        stablecoin,
                                                        worldCache.world,
                                                        stablecoinCache
                                                    );
                                                } catch (e: any) {
                                                    setError(e.toString());
                                                } finally {
                                                    setLoading("");
                                                }
                                            }
                                        }}
                                        disabled={
                                            !worldCache ||
                                            !stability ||
                                            !stablecoinCache ||
                                            !!loading
                                        }
                                    >
                                        {loading ===
                                        `Selling DVD for ${stablecoin.name}...` ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Sell DVD
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {loading && (
                <div className="mt-8 p-4 border border-blue-500 bg-blue-100 rounded-md">
                    <h3 className="text-lg font-semibold text-blue-700 mb-2">
                        Loading
                    </h3>
                    <p className="text-blue-600">{loading}</p>
                </div>
            )}

            {error && (
                <div className="mt-8 p-4 border border-red-500 bg-red-100 rounded-md">
                    <h3 className="text-lg font-semibold text-red-700 mb-2">Error</h3>
                    <p className="text-red-600">{error}</p>
                </div>
            )}
        </div>
    );
}

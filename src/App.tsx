import { Identity } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { createAgent } from '@dfinity/utils';
import bigInt from 'big-integer';
import { CSSProperties, useEffect, useState } from 'react';
import { ClipLoader } from 'react-spinners';
import './App.css';
import motokoLogo from './assets/motoko_moving.png';
import motokoShadowLogo from './assets/motoko_shadow.png';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import { backend } from './declarations/backend';

interface CanisterToken {
  canisterId: string;
  token: string;
  balance: string;
}

const override: CSSProperties = {
  display: 'block',
  margin: '0 auto',
  borderColor: 'rgb(54, 215, 183)',
};

let tokenCanisterArr: CanisterToken[] = [
  {
    canisterId: import.meta.env.VITE_ICP_LEDGER_CANISTER_ID,
    token: 'ICP',
    balance: '0',
  },
  {
    canisterId: import.meta.env.VITE_CHAT_LEDGER_CANISTER_ID,
    token: 'CHAT',
    balance: '0',
  },
  {
    canisterId: import.meta.env.VITE_SNS1_LEDGER_CANISTER_ID,
    token: 'SNS1',
    balance: '0',
  },
  {
    canisterId: import.meta.env.VITE_CKBTC_LEDGER_CANISTER_ID,
    token: 'CKBTC',
    balance: '0',
  },
];

function App() {
  const [count, setCount] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState(null);
  const [tokenArr, setTokenArr] = useState<CanisterToken[]>([]);
  const [principalId, setPrincipalId] = useState(null);
  const [color, setColor] = useState('#ffffff');

  // Get the current counter value
  const fetchCount = async () => {
    try {
      setLoading(true);
      const count = await backend.get();
      setCount(+count.toString()); // Convert BigInt to number
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const randomString = (length: number, chars: string) => {
    var result = '';
    for (var i = length; i > 0; --i)
      result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  };
  const rString = randomString(
    32,
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  );

  const seedToIdentity: (seed: string) => Identity | null = (seed) => {
    const seedBuf = new Uint8Array(new ArrayBuffer(32));
    if (seed.length && seed.length > 0 && seed.length <= 32) {
      seedBuf.set(new TextEncoder().encode(seed));
      return Ed25519KeyIdentity.generate(seedBuf);
    }
    return null;
  };
  const newIdentity = seedToIdentity(rString);

  const hexToNumber = (hexFormat: string) => {
    if (hexFormat.slice(0, 2) !== '0x') return undefined;
    const hex = hexFormat.substring(2);
    if (/^[a-fA-F0-9]+$/.test(hex)) {
      let numb = bigInt();
      for (let index = 0; index < hex.length; index++) {
        const digit = hex[hex.length - index - 1];
        numb = numb.add(
          bigInt(16)
            .pow(bigInt(index))
            .multiply(bigInt(`0x${digit}`)),
        );
      }
      return numb;
    } else {
      return undefined;
    }
  };

  const hexToUint8Array = (hex: string) => {
    const zero = bigInt(0);
    const n256 = bigInt(256);
    let bigNumber = hexToNumber(hex);
    if (bigNumber) {
      const result = new Uint8Array(32);
      let i = 0;
      while (bigNumber.greater(zero)) {
        result[32 - i - 1] = bigNumber.mod(n256).toJSNumber();
        bigNumber = bigNumber.divide(n256);
        i += 1;
      }
      return result;
    } else return new Uint8Array(32);
  };

  const toFullDecimal = (
    numb: bigint | string,
    decimal: number,
    maxDecimals?: number,
  ) => {
    if (BigInt(numb) === BigInt(0)) return '0';
    let numbStr = numb.toString();
    if (decimal === numbStr.length) {
      if (maxDecimals === 0) return '0';
      const newNumber = numbStr
        .slice(0, maxDecimals || decimal)
        .replace(/0+$/, '');
      return '0.' + newNumber;
    } else if (decimal > numbStr.length) {
      for (let index = 0; index < decimal; index++) {
        numbStr = '0' + numbStr;
        if (numbStr.length > decimal) break;
      }
    }
  };

  const toFixed = (num: string, fixed: number) => {
    var re = new RegExp('^-?\\d+(?:.\\d{0,' + (fixed || -1) + '})?');
    return num ? parseFloat(num.match(re)![0]).toFixed(fixed) : '';
  };

  const getSubAccountBalance = async () => {
    if (newIdentity) {
      const agent = await createAgent({
        identity: newIdentity,
        host: import.meta.env.VITE_AGENT_HOST,
      });

      setPrincipalId(import.meta.env.VITE_WALLET_PRINCIPAL_ID);

      const array = tokenCanisterArr.map(async (row) => {
        const { balance } = IcrcLedgerCanister.create({
          agent,
          canisterId: Principal.fromText(
            row.canisterId
              ? row.canisterId
              : import.meta.env.VITE_ANONYMOUS_PRINCIPAL,
          ),
        });

        const subAccountBalance = await balance({
          owner: Principal.fromText(import.meta.env.VITE_WALLET_PRINCIPAL_ID),
          certified: false,
        });

        const ONE_TRILLION = BigInt(100000000);

        return {
          ...row,
          balance: toFixed(
            (Number(subAccountBalance) / Number(ONE_TRILLION)).toString(),
            5,
          ),
        } as CanisterToken;
      });

      const tokenArray = await Promise.all(array);
      setTokenArr(tokenArray);
    }
  };

  // Fetch the count on page load
  useEffect(() => {
    getSubAccountBalance();
  }, []);

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a
          href="https://internetcomputer.org/docs/current/developer-docs/build/cdks/motoko-dfinity/motoko/"
          target="_blank"
        >
          <span className="logo-stack">
            <img
              src={motokoShadowLogo}
              className="logo motoko-shadow"
              alt="Motoko logo"
            />
            <img src={motokoLogo} className="logo motoko" alt="Motoko logo" />
          </span>
        </a>
      </div>
      <h1>ICRC-1 Balance</h1>

      <div className="card">
        <div>
          <span className="font-weight-bold">Principal: </span>
          <span>{principalId}</span>
        </div>

        {tokenArr.map((row, index) =>
          row.balance ? (
            <div key={index}>
              <span className="font-weight-bold">{row.token} Balance: </span>
              <span>{row.balance} ICP</span>
            </div>
          ) : (
            <ClipLoader
              color={color}
              loading={loading}
              cssOverride={override}
              size={30}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          ),
        )}
      </div>
    </div>
  );
}

export default App;

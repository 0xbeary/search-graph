import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  // Messages inside [] means that it's a UI element or a user event. For example:
  // - "[Price of GRT = 100]" means that an interface of the price of the GRT token is shown to the user.
  // - "[User has changed the amount of GRT to 10]" means that the user has changed the amount of GRT to 10 in the UI.
  
  // If the user requests purchasing a token, call \`show_stock_purchase_ui\` to show the purchase UI.
  // If the user just wants the price, call \`show_stock_price\` to show the price.
  // If you want to show trending tokens, call \`list_stocks\`.
  // If you want to show events, call \`get_events\`.
  // If the user wants to sell stock, or complete another impossible task, respond that you are a demo and cannot do that.
  

  // Skip the subgraph lookup step for now

  const result = await streamUI({
    model: openai('gpt-4o'),
    initial: <SpinnerMessage />,
    system: `\

    You are a bot that returns Graph Protocol GraphQL queries as the response.
    If the user asks to visualise the request -
    call \`visualise_data\` to show the execute visualise UI to show the visualise UI.
    If the user asks to execute the request -
    call \`list_stocks\` to show the execute request UI to show the execute UI.
    

    If the user might ask a specific question about the data fetched or the protocol it was fetched from. 
    Have an easy to understand discussion if needed, otherwise return the JSON or execute the functions. 
    
    At the end of the prompt you will see 2 extra sections:
    
    - "Context" - this is the information about the protocol the user is asking. It should provide an overview of the protocol functionality and will
    help you communicate relevant information with the user.
    - "Schema" - this is a GraphQL schema uploaded by the developer of the protocol. The GraphQL syntax used should be compatible with the Graph Protocol's specification. 
    Use the comments from the schema to understand the meaning of the request. Use the entities to construct a GraphQL query that would 
    return the data that the user desires. Return the GraphQL request as just the code. If the user asks you for a token with a particular name
    build a search query. Be intelligent when user asks for a "Name LP / Pool / Contract", they probably mean to search just the name.



    Besides that, you can also chat with users and do some calculations if needed.
    

    Context:

    UNCX Network is a one-stop shop with providing its customers with everything they need to 
    launch and maintain a sustainable and secure protocol. 
    Create your token, secure your LP with our liquidity lockers, 
    vest your supply according to your tokenomics and create farming/staking 
    incentives with customisable rewards.

    Schema:
    
    type Locker @entity {
    "locker address"
    id: ID!

    "Total number of locks"
    totalLocks: BigInt!

    "Total number of tokens"
    totalTokens: BigInt!

    "number of active pools, liquity greater than 0"
    numberActivePools: BigInt!

    "number of active Locked Pools, lockedLiquity  greater than 0"
    numberActiveLockedPools: BigInt!

    "number of active Tokens, token.tvlUSD  greater than 0"
    numberActiveTokens: BigInt!

    "number of active Locked Tokens, token.tvlLockedUSD greater than 0"
    numberActiveLockedTokens: BigInt!

    "last Unlock update timestamp"
    timestamp: BigInt!

    "last Unlock update block"
    blockNumber: BigInt!

    locks: [Lock!]! @derivedFrom(field: "locker")

    aggregates: [Aggregate!]! @derivedFrom(field: "locker")
  }

  type Manager @entity {
    " position manager address "
    id: ID!
  }

  type Aggregate @entity {
    " pool aggregate (all pools added without the fee tier) (manager + token0 + token1) "
    id: ID!

    " token0 address "
    token0: Token!

    " token1 address "
    token1: Token!

    " position manager address "
    manager: Manager!

    " Total number of locks corresponding to token0 & token1"
    numberOfLocks: BigInt!

    locker: Locker!

    " total USD value of the core asset locked (non withdrawable) "
    lockedCoreUSD: BigDecimal!

    " liquidity stored in a lock (non withdrawable) "
    lockedLiquidity: BigInt!

    " amount0 stored in a lock (non withdrawable) "
    lockedAmount0: BigInt!

    " amount1 stored in a lock (non withdrawable) "
    lockedAmount1: BigInt!

    " locked percent of the active liquidity (non withdrawable) "
    lockedPercent: BigDecimal!

    " total position liquidity "
    liquidity: BigInt!

    " amount of token0 stored in the position "
    amount0: BigInt!

    " amount of token1 stored in the position "
    amount1: BigInt!

    " core token USD TVL stored in the position (such as stablecoins, ETH, BNB etc.)"
    coreTotalUSD: BigDecimal!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " all aggregated reserves "
    reserve: [Reserve!]! @derivedFrom(field: "aggregate")

    " all aggregated locks "
    locks: [Lock!]! @derivedFrom(field: "aggregate")
  }

  type Reserve @entity {
    " pool address "
    id: ID!

    " locked liquidity reserve "
    liquidity: BigInt!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " pool object (pool address) "
    pool: Pool!

    " pool aggregate (all pools added without the fee tier) (manager + token0 + token1) "
    aggregate: Aggregate!

    " position manager address "
    manager: Manager!

    "total USD value of the core asset locked (non withdrawable) "
    lockedCoreUSD: BigDecimal!

    " liquidity stored in a lock (non withdrawable) "
    lockedLiquidity: BigInt!

    " amount0 stored in a lock (non withdrawable) "
    lockedAmount0: BigInt!

    " amount1 stored in a lock (non withdrawable) "
    lockedAmount1: BigInt!

    " locked percent of the active liquidity (non withdrawable) "
    lockedPercent: BigDecimal!

    " amount of token0 stored in the pool "
    amount0: BigInt!

    " amount of token1 stored in the pool "
    amount1: BigInt!

    " core token USD TVL stored in the pool (such as stablecoins, ETH, BNB etc.)"
    coreTotalUSD: BigDecimal!

    " all locks in a reserve (locks for a pool) "
    locks: [Lock!]! @derivedFrom(field: "reserve")

    " locker address "
    locker: Locker!

    " Total number of locks corresponding to token0 & token1"
    numberOfLocks: BigInt!
  }

  type Pool @entity {
    " pool address "
    id: ID!

    " pool fee tier "
    feeTier: BigInt!

    " token0 address "
    token0: Token!

    " token1 address "
    token1: Token!

    " amount of token0 stored in the pool "
    amount0: BigInt!

    " amount of token1 stored in the pool "
    amount1: BigInt!

    " relative price of token0"
    price0: BigDecimal!

    " relative price of token1"
    price1: BigDecimal!

    " total in range liquidity "
    activeLiquidity: BigInt!

    " sqrtPriceX96, used for calculations "
    sqrtPriceX96: BigInt!

    " current pool tick "
    currentTick: BigInt!

    " all positions IDs "
    positionIds: [String!]!

    " all positions "
    positions: [Position!]! @derivedFrom(field: "pool")

    " reserve (pool address) "
    reserve: Reserve!

    " aggregator "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!
  }

  type Lock @entity {
    " locker address + lock id "
    id: ID!

    " lock id "
    lockId: String!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " liquidity stored in a lock (non withdrawable) "
    lockedLiquidity: BigInt!

    " amount0 stored in a lock (non withdrawable) "
    lockedAmount0: BigInt!

    " amount1 stored in a lock (non withdrawable) "
    lockedAmount1: BigInt!

    " USD value of the core asset locked (non withdrawable) "
    lockedCoreUSD: BigDecimal!

    " locked percent of the active liquidity (non withdrawable) "
    lockedPercent: BigDecimal!

    " lock pending owner address, null if no one "
    pendingOwner: Wallet

    " lock owner address "
    owner: Wallet!

    " fee collection address "
    collector: Wallet!

    " additional fee collection address "
    additionalCollector: Wallet!

    " unlock date as a timestamp "
    unlockDate: BigInt!

    " nft position (manager + nft id) "
    position: Position!

    " (pool address) "
    reserve: Reserve!

    " aggregator "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!

    " locker address "
    locker: Locker!

    " last update block "
    blockNumber: BigInt!

    " last update timestamp "
    timestamp: BigInt!

    lockDate: BigInt!
    LockDateBlock: BigInt!

    # events

    " list all lock events for a lock "
    lockEvents: [LockEvent!]! @derivedFrom(field: "lock")

    # " list all unlock events for a lock "
    # unlockEvents: [UnlockEvent!]! @derivedFrom(field: "lock")

    " list all withdraw events for a lock "
    withdrawEvents: [WithdrawEvent!]! @derivedFrom(field: "lock")

    " list all increase liquidity events for a lock "
    increaseEvents: [IncreaseEvent!]! @derivedFrom(field: "lock")

    " list all relock events for a lock "
    relockEvents: [RelockEvent!]! @derivedFrom(field: "lock")

    " list all transfer events for a lock "
    transferOwnershipEvents: [TransferOwnershipEvent!]!
      @derivedFrom(field: "lock")

    " list all migration events for a lock "
    migrateEvents: [MigrateEvent!]! @derivedFrom(field: "lock")
  }

  type Position @entity {
    " Position Manager + NFT ID "
    id: ID!

    " id of the non fungible position "
    nftId: String!

    " token0 address "
    token0: Token!

    " token1 address "
    token1: Token!

    " lower tick of the position "
    lowerTick: BigInt!

    " upper tick of the position "
    upperTick: BigInt!

    " total position liquidity "
    liquidity: BigInt!

    " amount of token0 stored in the position "
    amount0: BigInt!

    " amount of token1 stored in the position "
    amount1: BigInt!

    " core token USD TVL stored in the position (such as stablecoins, ETH, BNB etc.)"
    coreTotalUSD: BigDecimal!

    " lock nonce "
    lock: Lock!

    " pool address "
    pool: Pool!

    " aggregate "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!

    previousRatio: BigDecimal!
    ratio: BigDecimal!
  }

  type Token @entity {
    " Smart contract address of the token "
    id: ID!

    " Name of the token, mirrored from the smart contract "
    name: String!

    " Symbol of the token, mirrored from the smart contract "
    symbol: String!

    " The number of decimal places this token uses, default to 18 "
    decimals: Int!

    " Dollar value locked in this token across all pools / amms"
    tvlUSD: BigDecimal!

    " Dollar value locked in this token across all pools / amms (non withdrawable)"
    lockedUSD: BigDecimal!

    " all reserves where this token is the main token "
    mainTokenReserves: [Reserve!]! @derivedFrom(field: "mainToken")

    " all reserves where this token is the core token "
    baseTokenReserves: [Reserve!]! @derivedFrom(field: "baseToken")

    " check if token is a base token "
    baseTokens: [BaseToken!]! @derivedFrom(field: "token")

    " last update block "
    blockNumber: BigInt!

    " last update timestamp "
    timestamp: BigInt!
  }

  type BaseToken @entity {
    " Smart contract address of the token "
    id: ID!

    " Token Data "
    token: Token!

    " If asset is a core liquid asset, set it's price. Useful for TVL calculations "
    basePrice: BigInt!

    " Timestamp for updating base price based on the timestamp threshold "
    lastBaseUpdatedTimestamp: BigInt!
  }

  type Wallet @entity {
    " account address "
    id: ID!


    ownerships: [Lock!]! @derivedFrom(field: "owner")
    pendingOwnerships: [Lock!] @derivedFrom(field: "pendingOwner")
    collectors: [Lock!]! @derivedFrom(field: "collector")
    additionalCollectors: [Lock!]! @derivedFrom(field: "additionalCollector")
  }

  type EventCollection @entity {
    " Locker Address "
    id: ID!
    lockEvents: [LockEvent!]! @derivedFrom(field: "eventsCollection")
    lockEventsNumber: BigInt!
    # unlockEvents: [UnlockEvent!]! @derivedFrom(field: "eventsCollection")
    # unlockEventsNumber: BigInt!
    withdrawEvents: [WithdrawEvent!]! @derivedFrom(field: "eventsCollection")
    withdrawEventsNumber: BigInt!
    increaseEvents: [IncreaseEvent!]! @derivedFrom(field: "eventsCollection")
    increaseEventsNumber: BigInt!
    relockEvents: [RelockEvent!]! @derivedFrom(field: "eventsCollection")
    relockEventsNumber: BigInt!
    transferOwnershipEvents: [TransferOwnershipEvent!]!
      @derivedFrom(field: "eventsCollection")
    transferOwnershipEventsNumber: BigInt!
    TransferOwnershipStartedEvents: [TransferOwnershipStartedEvent!]! @derivedFrom(field:"eventsCollection")
    TransferOwnershipStartedEventsNumber: BigInt!
    migrateEvents: [MigrateEvent!]! @derivedFrom(field: "eventsCollection")
    migrateEventsNumber: BigInt!
    collectorEvents: [CollectorEvent!]! @derivedFrom(field: "eventsCollection")
    collectorEventsNumber: BigInt!
    additionalCollectorEvents: [AdditionalCollectorEvent!]!
      @derivedFrom(field: "eventsCollection")
    additionalCollectorEventsNumber: BigInt!

    chainId: BigInt!
  }

  type LockEvent @entity(immutable: true) {
    " locker address + event index "
    id: ID!

    " lock id "
    lockId: String!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " liquidity stored in a lock (non withdrawable) "
    lockedLiquidity: BigInt!

    " amount0 stored in a lock (non withdrawable) "
    lockedAmount0: BigInt!

    " amount1 stored in a lock (non withdrawable) "
    lockedAmount1: BigInt!

    " USD value of the core asset locked (non withdrawable) "
    lockedCoreUSD: BigDecimal!

    " locked percent of the active liquidity (non withdrawable) "
    lockedPercent: BigDecimal!

    " lock owner address "
    owner: Wallet!

    " fee collection address "
    collector: Wallet!

    " additional fee collection address "
    additionalCollector: Wallet!

    " nft position (manager + nft id) "
    position: Position

    " Lock ID "
    lock: Lock

    " (pool address) "
    reserve: Reserve!

    " aggregator "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!

    " locker address "
    locker: Locker!

    " unlock date as a timestamp "
    unlockDate: BigInt!

    " event block "
    blockNumber: BigInt!

    " event timestamp "
    timestamp: BigInt!

    " transaction hash "
    transaction: Bytes!

    " collection reference "
    eventsCollection: EventCollection!
  }

  type WithdrawEvent @entity(immutable: true) {
    " locker address + event index "
    id: ID!

    " lock id "
    lockId: String!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " liquidity withdrawn from a lock (non withdrawable) "
    withdrawnLiquidity: BigInt!

    " amount0 withdrawn from a lock (non withdrawable) "
    withdrawnAmount0: BigInt!

    " amount1 withdrawn from a lock (non withdrawable) "
    withdrawnAmount1: BigInt!

    " USD value of the core asset withdrawn "
    withdrawnCoreUSD: BigDecimal!

    " withdrawn percent of the active liquidity "
    withdrawnPercent: BigDecimal!

    " lock owner address "
    owner: Wallet!

    " fee collection address "
    collector: Wallet!

    " additional fee collection address "
    additionalCollector: Wallet!

    " nft position (manager + nft id) "
    position: Position

    " Lock ID "
    lock: Lock

    " (pool address) "
    reserve: Reserve!

    " aggregator "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!

    " locker address "
    locker: Locker!

    " unlock date as a timestamp "
    unlockDate: BigInt!

    " event block "
    blockNumber: BigInt!

    " event timestamp "
    timestamp: BigInt!

    " transaction hash "
    transaction: Bytes!

    " collection reference "
    eventsCollection: EventCollection!
  }

  type IncreaseEvent @entity(immutable: true) {
    " locker address + event index "
    id: ID!

    " lock id "
    lockId: String!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " liquidity stored before increase in a lock (non withdrawable) "
    lockedLiquidityBefore: BigInt!

    " amount0 stored before increase in a lock (non withdrawable) "
    lockedAmount0Before: BigInt!

    " amount1 stored before increase in a lock (non withdrawable) "
    lockedAmount1Before: BigInt!

    " USD value of the core asset locked before increase (non withdrawable) "
    lockedCoreUSDBefore: BigDecimal!

    " locked percent of the active liquidity before increase (non withdrawable) "
    lockedPercentBefore: BigDecimal!

    " liquidity stored in a lock after increase (non withdrawable) "
    lockedLiquidityAfter: BigInt!

    " amount0 stored in a lock after increase (non withdrawable) "
    lockedAmount0After: BigInt!

    " amount1 stored in a lock after increase (non withdrawable) "
    lockedAmount1After: BigInt!

    " USD value of the core asset locked after increase (non withdrawable) "
    lockedCoreUSDAfter: BigDecimal!

    " locked percent of the active liquidity after increase (non withdrawable) "
    lockedPercentAfter: BigDecimal!

    " lock owner address "
    owner: Wallet!

    " fee collection address "
    collector: Wallet!

    " additional fee collection address "
    additionalCollector: Wallet!

    " nft position (manager + nft id) "
    position: Position

    " Lock ID "
    lock: Lock

    " (pool address) "
    reserve: Reserve!

    " aggregator "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!

    " locker address "
    locker: Locker!

    " unlock date as a timestamp "
    unlockDate: BigInt!

    " event block "
    blockNumber: BigInt!

    " event timestamp "
    timestamp: BigInt!

    " transaction hash "
    transaction: Bytes!

    " collection reference "
    eventsCollection: EventCollection!
  }

  type RelockEvent @entity(immutable: true) {
    " locker address + event index "
    id: ID!

    " lock id "
    lockId: String!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " liquidity stored in a lock (non withdrawable) "
    lockedLiquidity: BigInt!

    " amount0 stored in a lock (non withdrawable) "
    lockedAmount0: BigInt!

    " amount1 stored in a lock (non withdrawable) "
    lockedAmount1: BigInt!

    " USD value of the core asset locked (non withdrawable) "
    lockedCoreUSD: BigDecimal!

    " locked percent of the active liquidity (non withdrawable) "
    lockedPercent: BigDecimal!

    " lock owner address  transfer "
    owner: Wallet!

    " fee collection address "
    collector: Wallet!

    " additional fee collection address "
    additionalCollector: Wallet!

    " nft position (manager + nft id) "
    position: Position

    " Lock ID "
    lock: Lock

    " (pool address) "
    reserve: Reserve!

    " aggregator "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!

    " locker address "
    locker: Locker!

    " old unlock date as a timestamp "
    unlockDateBefore: BigInt!

    " new unlock date as a timestamp "
    unlockDateAfter: BigInt!

    " event block "
    blockNumber: BigInt!

    " event timestamp "
    timestamp: BigInt!

    " transaction hash "
    transaction: Bytes!

    " collection reference "
    eventsCollection: EventCollection!
  }

  type TransferOwnershipEvent @entity(immutable: true) {
    " locker address + event index "
    id: ID!

    " lock id "
    lockId: String!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " liquidity stored in a lock (non withdrawable) "
    lockedLiquidity: BigInt!

    " amount0 stored in a lock (non withdrawable) "
    lockedAmount0: BigInt!

    " amount1 stored in a lock (non withdrawable) "
    lockedAmount1: BigInt!

    " USD value of the core asset locked (non withdrawable) "
    lockedCoreUSD: BigDecimal!

    " locked percent of the active liquidity (non withdrawable) "
    lockedPercent: BigDecimal!

    " lock owner address before transfer "
    ownerBefore: Wallet!

    " lock owner address after transfer "
    ownerAfter: Wallet!

    " fee collection address "
    collector: Wallet!

    " additional fee collection address "
    additionalCollector: Wallet!

    " nft position (manager + nft id) "
    position: Position

    " Lock ID "
    lock: Lock

    " (pool address) "
    reserve: Reserve!

    " aggregator "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!

    " locker address "
    locker: Locker!

    " unlock date as a timestamp "
    unlockDate: BigInt!

    " event block "
    blockNumber: BigInt!

    " event timestamp "
    timestamp: BigInt!

    " transaction hash "
    transaction: Bytes!

    " collection reference "
    eventsCollection: EventCollection!
  }

  type TransferOwnershipStartedEvent @entity(immutable: true) {
    " locker address + event index "
    id: ID!

    " lock owner address before transfer "
    currentOwner: Wallet!

    " lock owner address after transfer "
    pendingOwner: Wallet!

    " nft position (manager + nft id) "
    position: Position

    " Lock ID "
    lock: Lock

    " event block "
    blockNumber: BigInt!

    " event timestamp "
    timestamp: BigInt!

    " transaction hash "
    transaction: Bytes!

    " collection reference "
    eventsCollection: EventCollection!
  }

  type MigrateEvent @entity(immutable: true) {
    " locker address + event index "
    id: ID!

    " lock id "
    lockId: String!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " liquidity stored in a lock (non withdrawable) "
    lockedLiquidity: BigInt!

    " amount0 stored in a lock (non withdrawable) "
    lockedAmount0: BigInt!

    " amount1 stored in a lock (non withdrawable) "
    lockedAmount1: BigInt!

    " USD value of the core asset locked (non withdrawable) "
    lockedCoreUSD: BigDecimal!

    " locked percent of the active liquidity (non withdrawable) "
    lockedPercent: BigDecimal!

    " lock owner address  transfer "
    owner: Wallet!

    " fee collection address "
    collector: Wallet!

    " additional fee collection address "
    additionalCollector: Wallet!

    " nft position (manager + nft id) "
    position: Position

    " Lock ID "
    lock: Lock

    " (pool address) "
    reserve: Reserve!

    " aggregator "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!

    " locker address "
    locker: Locker!

    " unlock date as a timestamp "
    unlockDate: BigInt!

    " event block "
    blockNumber: BigInt!

    " event timestamp "
    timestamp: BigInt!

    " transaction hash "
    transaction: Bytes!

    " collection reference "
    eventsCollection: EventCollection!
  }

  type CollectorEvent @entity(immutable: true) {
    " locker address + event index "
    id: ID!

    " lock id "
    lockId: String!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " liquidity stored in a lock (non withdrawable) "
    lockedLiquidity: BigInt!

    " amount0 stored in a lock (non withdrawable) "
    lockedAmount0: BigInt!

    " amount1 stored in a lock (non withdrawable) "
    lockedAmount1: BigInt!

    " USD value of the core asset locked (non withdrawable) "
    lockedCoreUSD: BigDecimal!

    " locked percent of the active liquidity (non withdrawable) "
    lockedPercent: BigDecimal!

    " lock owner address  transfer "
    owner: Wallet!

    " old fee collection address "
    collectorBefore: Wallet!

    " new fee collection address "
    collectorAfter: Wallet!

    " additional fee collection address "
    additionalCollector: Wallet!

    " nft position (manager + nft id) "
    position: Position

    " Lock ID "
    lock: Lock

    " (pool address) "
    reserve: Reserve!

    " aggregator "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!

    " locker address "
    locker: Locker!

    " unlock date as a timestamp "
    unlockDate: BigInt!

    " event block "
    blockNumber: BigInt!

    " event timestamp "
    timestamp: BigInt!

    " transaction hash "
    transaction: Bytes!

    " collection reference "
    eventsCollection: EventCollection!
  }

  type AdditionalCollectorEvent @entity(immutable: true) {
    " locker address + event index "
    id: ID!

    " lock id "
    lockId: String!

    " main token (does not follow token0 / token1 contract order)"
    mainToken: Token!

    " core tokens such as stablecoins, ETH, BNB etc. (does not follow token0 / token1 contract order)"
    baseToken: Token!

    baseTracked: Boolean!

    " liquidity stored in a lock (non withdrawable) "
    lockedLiquidity: BigInt!

    " amount0 stored in a lock (non withdrawable) "
    lockedAmount0: BigInt!

    " amount1 stored in a lock (non withdrawable) "
    lockedAmount1: BigInt!

    " USD value of the core asset locked (non withdrawable) "
    lockedCoreUSD: BigDecimal!

    " locked percent of the active liquidity (non withdrawable) "
    lockedPercent: BigDecimal!

    " lock owner address  transfer "
    owner: Wallet!

    " fee collection address "
    collector: Wallet!

    " old additional fee collection address "
    additionalCollectorBefore: Wallet!

    " new additional fee collection address "
    additionalCollectorAfter: Wallet!

    " nft position (manager + nft id) "
    position: Position

    " Lock ID "
    lock: Lock

    " (pool address) "
    reserve: Reserve!

    " aggregator "
    aggregate: Aggregate!

    " position manager "
    manager: Manager!

    " locker address "
    locker: Locker!

    " unlock date as a timestamp "
    unlockDate: BigInt!

    " event block "
    blockNumber: BigInt!

    " event timestamp "
    timestamp: BigInt!

    " transaction hash "
    transaction: Bytes!

    " collection reference "
    eventsCollection: EventCollection!
  }

  type _Schema_
    @fulltext(
      name: "tokenSearch"
      language: en
      algorithm: rank
      include: [
        {
          entity: "Token"
          fields: [{ name: "symbol" }, { name: "name" }, { name: "id" }]
        }
      ]
    )
    @fulltext(
      name: "poolSearch"
      language: en
      algorithm: rank
      include: [{ entity: "Pool", fields: [{ name: "id" }] }]
    )
    @fulltext(
      name: "lockSearch"
      language: en
      algorithm: rank
      include: [{ entity: "Lock", fields: [{ name: "lockId" }] }]
    )
    @fulltext(
      name: "reserveSearch"
      language: en
      algorithm: rank
      include: [{ entity: "Reserve", fields: [{ name: "id" }] }]
    )
    @fulltext(
      name: "walletSearch"
      language: en
      algorithm: rank
      include: [{ entity: "Wallet", fields: [{ name: "id" }] }]
    )

   `,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      listStocks: {
        description: 'List three imaginary stocks that are trending.',
        parameters: z.object({
          stocks: z.array(
            z.object({
              symbol: z.string().describe('The symbol of the stock'),
              price: z.number().describe('The price of the stock'),
              delta: z.number().describe('The change in price of the stock')
            })
          )
        }),
        generate: async function* ({ stocks }) {
          yield (
            <BotCard>
              <StocksSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'listStocks',
                    toolCallId,
                    args: { stocks }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'listStocks',
                    toolCallId,
                    result: stocks
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Stocks props={stocks} />
            </BotCard>
          )
        }
      },
      visualiseData: {
        description:
          'Get the current stock price of a given stock or currency. Use this to show the price to the user.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          delta: z.number().describe('The change in price of the stock')
        }),
        generate: async function* ({ symbol, price, delta }) {
          yield (
            <BotCard>
              <StockSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showStockPrice',
                    toolCallId,
                    args: { symbol, price, delta }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showStockPrice',
                    toolCallId,
                    result: { symbol, price, delta }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Stock props={{ symbol, price, delta }} />
            </BotCard>
          )
        }
      },
      
      // getEvents: {
      //   description:
      //     'List funny imaginary events between user highlighted dates that describe stock activity.',
      //   parameters: z.object({
      //     events: z.array(
      //       z.object({
      //         date: z
      //           .string()
      //           .describe('The date of the event, in ISO-8601 format'),
      //         headline: z.string().describe('The headline of the event'),
      //         description: z.string().describe('The description of the event')
      //       })
      //     )
      //   }),
      //   generate: async function* ({ events }) {
      //     yield (
      //       <BotCard>
      //         <EventsSkeleton />
      //       </BotCard>
      //     )

      //     await sleep(1000)

      //     const toolCallId = nanoid()

      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'getEvents',
      //               toolCallId,
      //               args: { events }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'getEvents',
      //               toolCallId,
      //               result: events
      //             }
      //           ]
      //         }
      //       ]
      //     })

      //     return (
      //       <BotCard>
      //         <Events props={events} />
      //       </BotCard>
      //     )
      //   }
      // }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}

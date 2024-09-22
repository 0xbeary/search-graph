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

// const result = await fetch(graphEndpoint, {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     Accept: 'application/json',
//   },
//   body: JSON.stringify({
//     query: graphql_query,
//   }),
// })



const getData = async (query: string, protocol: string) => {
  let graphEndpointS = process.env.GRAPH_ENDPOINT

  let graphEndpoint = graphEndpointS + ((protocol === 'UNCX Network') ? 'H9ZXC11AKM4q7mfUeqFqmENFfYhrenkJMi45i8Va2ww2' :
  '5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV')


  const eth_url = graphEndpoint
  const result = await fetch(eth_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: query,
    }),
  })

  // error handle
  if (!result.ok) {
    // This will activate the closest `error.js` Error Boundary
    // throw new Error('Failed to fetch poolTableSuspense data');
    return null
  }
  return result.json()
}


async function confirmPurchase(graphql_query: string, protocol: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()



  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Calling {protocol}...
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
          Calling {protocol}... working on it...
        </p>
      </div>
    )

    // await sleep(1000)

    let res = await getData(graphql_query, protocol)

    console.log(res, ' res');

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully called {protocol}

        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have successfully called {protocol} Result:

        {JSON.stringify(res, null)}

      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[Resulting GraphQL Request:
        ${JSON.stringify(res, null)}
          ]`
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


  // Skip the subgraph lookup step for now

  const result = await streamUI({
    model: openai('gpt-4o'),
    initial: <SpinnerMessage />,
    system: `\

    You are a bot that returns Graph Protocol GraphQL queries as the response.
    If the user asks to visualise the request -
    call \`visualise_data\` to show the execute visualise UI to show the visualise UI.
    If the user asks to execute the request -
    call \`execute_request\` to show the execute request UI to show the execute UI. The user might ask data
    from different protocols. For example UNCX Network and Uniswap V3.
    

    If the user might ask a specific question about the data fetched or the protocol it was fetched from. 
    Have an easy to understand discussion if needed, otherwise return the JSON or execute the functions. 
    
    At the end of the prompt you will see 2 extra sections:
    
    - "Context" - this is the information about the protocol the user might be asking. There are multiple protocols to choose from. 
    It should provide an overview of the protocol functionality and will
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



    Uniswap V3 is a decentralised AMM with custom liquidity ranges.


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


type Factory @entity {
  # factory address
  id: ID!
  # amount of pools created
  poolCount: BigInt!
  # amoutn of transactions all time
  txCount: BigInt!
  # total volume all time in derived USD
  totalVolumeUSD: BigDecimal!
  # total volume all time in derived ETH
  totalVolumeETH: BigDecimal!
  # all volume even through less reliable USD values
  untrackedVolumeUSD: BigDecimal!
  # total swap fees all time in USD
  totalFeesUSD: BigDecimal!
  # total swap fees all time in USD
  totalFeesETH: BigDecimal!
  # TVL derived in USD
  totalValueLockedUSD: BigDecimal!
  # TVL derived in ETH
  totalValueLockedETH: BigDecimal!
  # TVL derived in USD untracked
  totalValueLockedUSDUntracked: BigDecimal!
  # TVL derived in ETH untracked
  totalValueLockedETHUntracked: BigDecimal!
  # current owner of the factory
  owner: ID!

  # TODO: # used for optimism only, flag if backfill complete
  # TODO: populated: Boolean
}

# stores for USD calculations
type Bundle @entity {
  id: ID!
  # price of ETH in usd
  ethPriceUSD: BigDecimal!
}

type Token @entity {
  # token address
  id: ID!
  # token symbol
  symbol: String!
  # token name
  name: String!
  # token decimals
  decimals: BigInt!
  # token total supply
  totalSupply: BigInt!
  # volume in token units
  volume: BigDecimal!
  # volume in derived USD
  volumeUSD: BigDecimal!
  # volume in USD even on pools with less reliable USD values
  untrackedVolumeUSD: BigDecimal!
  # fees in USD
  feesUSD: BigDecimal!
  # transactions across all pools that include this token
  txCount: BigInt!
  # number of pools containing this token
  poolCount: BigInt!
  # liquidity across all pools in token units
  totalValueLocked: BigDecimal!
  # liquidity across all pools in derived USD
  totalValueLockedUSD: BigDecimal!
  # TVL derived in USD untracked
  totalValueLockedUSDUntracked: BigDecimal!
  # derived price in ETH
  derivedETH: BigDecimal!
  # pools token is in that are white listed for USD pricing
  whitelistPools: [Pool!]!
  # derived fields
  tokenDayData: [TokenDayData!]! @derivedFrom(field: "token")
}

type Pool @entity {
  # pool address
  id: ID!
  # creation
  createdAtTimestamp: BigInt!
  # block pool was created at
  createdAtBlockNumber: BigInt!
  # token0
  token0: Token!
  # token1
  token1: Token!
  # fee amount
  feeTier: BigInt!
  # in range liquidity
  liquidity: BigInt!
  # current price tracker
  sqrtPrice: BigInt!
  # tracker for global fee growth
  feeGrowthGlobal0X128: BigInt!
  # tracker for global fee growth
  feeGrowthGlobal1X128: BigInt!
  # token0 per token1
  token0Price: BigDecimal!
  # token1 per token0
  token1Price: BigDecimal!
  # current tick
  tick: BigInt
  # current observation index
  observationIndex: BigInt!
  # all time token0 swapped
  volumeToken0: BigDecimal!
  # all time token1 swapped
  volumeToken1: BigDecimal!
  # all time USD swapped
  volumeUSD: BigDecimal!
  # all time USD swapped, unfiltered for unreliable USD pools
  untrackedVolumeUSD: BigDecimal!
  # fees in USD
  feesUSD: BigDecimal!
  # all time number of transactions
  txCount: BigInt!
  # total token 0 across all ticks
  totalValueLockedToken0: BigDecimal!
  # total token 1 across all ticks
  totalValueLockedToken1: BigDecimal!
  # TVL derived ETH
  totalValueLockedETH: BigDecimal!
  # TVL USD
  totalValueLockedUSD: BigDecimal!
  # TVL derived in ETH untracked
  totalValueLockedETHUntracked: BigDecimal!
  # TVL derived in USD untracked
  totalValueLockedUSDUntracked: BigDecimal!
  # all time fees collected token0
  collectedFeesToken0: BigDecimal!
  # all time fees collected token1
  collectedFeesToken1: BigDecimal!
  # all time fees collected derived USD
  collectedFeesUSD: BigDecimal!
  # Fields used to help derived relationship
  liquidityProviderCount: BigInt! # used to detect new exchanges
  # hourly snapshots of pool data
  poolHourData: [PoolHourData!]! @derivedFrom(field: "pool")
  # daily snapshots of pool data
  poolDayData: [PoolDayData!]! @derivedFrom(field: "pool")
  # derived fields
  mints: [Mint!]! @derivedFrom(field: "pool")
  burns: [Burn!]! @derivedFrom(field: "pool")
  swaps: [Swap!]! @derivedFrom(field: "pool")
  collects: [Collect!]! @derivedFrom(field: "pool")
  ticks: [Tick!]! @derivedFrom(field: "pool")
}

type Tick @entity {
  # format: <pool address>#<tick index>
  id: ID!
  # pool address
  poolAddress: String
  # tick index
  tickIdx: BigInt!
  # created time
  createdAtTimestamp: BigInt!
  # created block
  createdAtBlockNumber: BigInt!
  # pointer to pool
  pool: Pool!
  # total liquidity pool has as tick lower or upper
  liquidityGross: BigInt!
  # how much liquidity changes when tick crossed
  liquidityNet: BigInt!
  # calculated price of token0 of tick within this pool - constant
  price0: BigDecimal!
  # calculated price of token1 of tick within this pool - constant
  price1: BigDecimal!
  # lifetime volume of token0 with this tick in range
  volumeToken0: BigDecimal!
  # lifetime volume of token1 with this tick in range
  volumeToken1: BigDecimal!
  # lifetime volume in derived USD with this tick in range
  volumeUSD: BigDecimal!
  # lifetime volume in untracked USD with this tick in range
  untrackedVolumeUSD: BigDecimal!
  # fees in USD
  feesUSD: BigDecimal!
  # all time collected fees in token0
  collectedFeesToken0: BigDecimal!
  # all time collected fees in token1
  collectedFeesToken1: BigDecimal!
  # all time collected fees in USD
  collectedFeesUSD: BigDecimal!
  # Fields used to help derived relationship
  liquidityProviderCount: BigInt! # used to detect new exchanges
  # derived fields
  # swaps: [Swap!]! @derivedFrom(field: "tick")
  # vars needed for fee computation
  feeGrowthOutside0X128: BigInt!
  feeGrowthOutside1X128: BigInt!
}

type Position @entity {
  # Positions created through NonfungiblePositionManager
  # NFT token id
  id: ID!
  # owner of the NFT
  owner: Bytes!
  # pool position is within
  pool: Pool!
  # allow indexing by tokens
  token0: Token!
  # allow indexing by tokens
  token1: Token!
  # lower tick of the position
  tickLower: Tick!
  # upper tick of the position
  tickUpper: Tick!
  # total position liquidity
  liquidity: BigInt!
  # amount of token 0 ever deposited to position
  depositedToken0: BigDecimal!
  # amount of token 1 ever deposited to position
  depositedToken1: BigDecimal!
  # amount of token 0 ever withdrawn from position (without fees)
  withdrawnToken0: BigDecimal!
  # amount of token 1 ever withdrawn from position (without fees)
  withdrawnToken1: BigDecimal!
  # all time collected fees in token0
  collectedFeesToken0: BigDecimal!
  # all time collected fees in token1
  collectedFeesToken1: BigDecimal!
  # tx in which the position was initialized
  transaction: Transaction!
  # vars needed for fee computation
  feeGrowthInside0LastX128: BigInt!
  feeGrowthInside1LastX128: BigInt!
}

type PositionSnapshot @entity {
  # <NFT token id>#<block number>
  id: ID!
  # owner of the NFT
  owner: Bytes!
  # pool the position is within
  pool: Pool!
  # position of which the snap was taken of
  position: Position!
  # block in which the snap was created
  blockNumber: BigInt!
  # timestamp of block in which the snap was created
  timestamp: BigInt!
  # total position liquidity
  liquidity: BigInt!
  # amount of token 0 ever deposited to position
  depositedToken0: BigDecimal!
  # amount of token 1 ever deposited to position
  depositedToken1: BigDecimal!
  # amount of token 0 ever withdrawn from position (without fees)
  withdrawnToken0: BigDecimal!
  # amount of token 1 ever withdrawn from position (without fees)
  withdrawnToken1: BigDecimal!
  # all time collected fees in token0
  collectedFeesToken0: BigDecimal!
  # all time collected fees in token1
  collectedFeesToken1: BigDecimal!
  # tx in which the snapshot was initialized
  transaction: Transaction!
  # internal vars needed for fee computation
  feeGrowthInside0LastX128: BigInt!
  feeGrowthInside1LastX128: BigInt!
}

type Transaction @entity(immutable: true) {
  # txn hash
  id: ID!
  # block txn was included in
  blockNumber: BigInt!
  # timestamp txn was confirmed
  timestamp: BigInt!
  # gas used during txn execution
  gasUsed: BigInt!
  gasPrice: BigInt!
  # derived values
  mints: [Mint]! @derivedFrom(field: "transaction")
  burns: [Burn]! @derivedFrom(field: "transaction")
  swaps: [Swap]! @derivedFrom(field: "transaction")
  flashed: [Flash]! @derivedFrom(field: "transaction")
  collects: [Collect]! @derivedFrom(field: "transaction")
}

type Mint @entity (immutable: true) {
  # transaction hash + "#" + index in mints Transaction array
  id: ID!
  # which txn the mint was included in
  transaction: Transaction!
  # time of txn
  timestamp: BigInt!
  # pool position is within
  pool: Pool!
  # allow indexing by tokens
  token0: Token!
  # allow indexing by tokens
  token1: Token!
  # owner of position where liquidity minted to
  owner: Bytes!
  # the address that minted the liquidity
  sender: Bytes
  # txn origin
  origin: Bytes! # the EOA that initiated the txn
  # amount of liquidity minted
  amount: BigInt!
  # amount of token 0 minted
  amount0: BigDecimal!
  # amount of token 1 minted
  amount1: BigDecimal!
  # derived amount based on available prices of tokens
  amountUSD: BigDecimal
  # lower tick of the position
  tickLower: BigInt!
  # upper tick of the position
  tickUpper: BigInt!
  # order within the txn
  logIndex: BigInt
}

type Burn @entity (immutable: true) {
  # transaction hash + "#" + index in mints Transaction array
  id: ID!
  # txn burn was included in
  transaction: Transaction!
  # pool position is within
  pool: Pool!
  # allow indexing by tokens
  token0: Token!
  # allow indexing by tokens
  token1: Token!
  # need this to pull recent txns for specific token or pool
  timestamp: BigInt!
  # owner of position where liquidity was burned
  owner: Bytes
  # txn origin
  origin: Bytes! # the EOA that initiated the txn
  # amouny of liquidity burned
  amount: BigInt!
  # amount of token 0 burned
  amount0: BigDecimal!
  # amount of token 1 burned
  amount1: BigDecimal!
  # derived amount based on available prices of tokens
  amountUSD: BigDecimal
  # lower tick of position
  tickLower: BigInt!
  # upper tick of position
  tickUpper: BigInt!
  # position within the transactions
  logIndex: BigInt
}

type Swap @entity (immutable: true) {
  # transaction hash + "#" + index in swaps Transaction array
  id: ID!
  # pointer to transaction
  transaction: Transaction!
  # timestamp of transaction
  timestamp: BigInt!
  # pool swap occured within
  pool: Pool!
  # allow indexing by tokens
  token0: Token!
  # allow indexing by tokens
  token1: Token!
  # sender of the swap
  sender: Bytes!
  # recipient of the swap
  recipient: Bytes!
  # txn origin
  origin: Bytes! # the EOA that initiated the txn
  # delta of token0 swapped
  amount0: BigDecimal!
  # delta of token1 swapped
  amount1: BigDecimal!
  # derived info
  amountUSD: BigDecimal!
  # The sqrt(price) of the pool after the swap, as a Q64.96
  sqrtPriceX96: BigInt!
  # the tick after the swap
  tick: BigInt!
  # index within the txn
  logIndex: BigInt
}

type Collect @entity {
  # transaction hash + "#" + index in collect Transaction array
  id: ID!
  # pointer to txn
  transaction: Transaction!
  # timestamp of event
  timestamp: BigInt!
  # pool collect occured within
  pool: Pool!
  # owner of position collect was performed on
  owner: Bytes
  # amount of token0 collected
  amount0: BigDecimal!
  # amount of token1 collected
  amount1: BigDecimal!
  # derived amount based on available prices of tokens
  amountUSD: BigDecimal
  # lower tick of position
  tickLower: BigInt!
  # uppper tick of position
  tickUpper: BigInt!
  # index within the txn
  logIndex: BigInt
}

type Flash @entity {
  # transaction hash + "-" + index in collect Transaction array
  id: ID!
  # pointer to txn
  transaction: Transaction!
  # timestamp of event
  timestamp: BigInt!
  # pool collect occured within
  pool: Pool!
  # sender of the flash
  sender: Bytes!
  # recipient of the flash
  recipient: Bytes!
  # amount of token0 flashed
  amount0: BigDecimal!
  # amount of token1 flashed
  amount1: BigDecimal!
  # derived amount based on available prices of tokens
  amountUSD: BigDecimal!
  # amount token0 paid for flash
  amount0Paid: BigDecimal!
  # amount token1 paid for flash
  amount1Paid: BigDecimal!
  # index within the txn
  logIndex: BigInt
}

# Data accumulated and condensed into day stats for all of Uniswap
type UniswapDayData @entity {
  # timestamp rounded to current day by dividing by 86400
  id: ID!
  # timestamp rounded to current day by dividing by 86400
  date: Int!
  # total daily volume in Uniswap derived in terms of ETH
  volumeETH: BigDecimal!
  # total daily volume in Uniswap derived in terms of USD
  volumeUSD: BigDecimal!
  # total daily volume in Uniswap derived in terms of USD untracked
  volumeUSDUntracked: BigDecimal!
  # tvl in terms of USD
  totalValueLockedUSD: BigDecimal!
  # fees in USD
  feesUSD: BigDecimal!
  # number of daily transactions
  txCount: BigInt!
}

# Data accumulated and condensed into day stats for each pool
type PoolDayData @entity {
  # timestamp rounded to current day by dividing by 86400
  id: ID!
  # timestamp rounded to current day by dividing by 86400
  date: Int!
  # pointer to pool
  pool: Pool!
  # in range liquidity at end of period
  liquidity: BigInt!
  # current price tracker at end of period
  sqrtPrice: BigInt!
  # price of token0 - derived from sqrtPrice
  token0Price: BigDecimal!
  # price of token1 - derived from sqrtPrice
  token1Price: BigDecimal!
  # current tick at end of period
  tick: BigInt
  # tracker for global fee growth
  feeGrowthGlobal0X128: BigInt!
  # tracker for global fee growth
  feeGrowthGlobal1X128: BigInt!
  # TVL derived in USD at end of period
  totalValueLockedUSD: BigDecimal!
  # volume in token0
  volumeToken0: BigDecimal!
  # volume in token1
  volumeToken1: BigDecimal!
  # volume in USD
  volumeUSD: BigDecimal!
  # fees in USD
  feesUSD: BigDecimal!
  # numebr of transactions during period
  txCount: BigInt!
  # opening price of token0
  open: BigDecimal!
  # high price of token0
  high: BigDecimal!
  # low price of token0
  low: BigDecimal!
  # close price of token0
  close: BigDecimal!
}

# hourly stats tracker for pool
type PoolHourData @entity {
  # format: <pool address>-<timestamp>
  id: ID!
  # unix timestamp for start of hour
  periodStartUnix: Int!
  # pointer to pool
  pool: Pool!
  # in range liquidity at end of period
  liquidity: BigInt!
  # current price tracker at end of period
  sqrtPrice: BigInt!
  # price of token0 - derived from sqrtPrice
  token0Price: BigDecimal!
  # price of token1 - derived from sqrtPrice
  token1Price: BigDecimal!
  # current tick at end of period
  tick: BigInt
  # tracker for global fee growth
  feeGrowthGlobal0X128: BigInt!
  # tracker for global fee growth
  feeGrowthGlobal1X128: BigInt!
  # tvl derived in USD at end of period
  totalValueLockedUSD: BigDecimal!
  # volume in token0
  volumeToken0: BigDecimal!
  # volume in token1
  volumeToken1: BigDecimal!
  # volume in USD
  volumeUSD: BigDecimal!
  # fees in USD
  feesUSD: BigDecimal!
  # numebr of transactions during period
  txCount: BigInt!
  # opening price of token0
  open: BigDecimal!
  # high price of token0
  high: BigDecimal!
  # low price of token0
  low: BigDecimal!
  # close price of token0
  close: BigDecimal!
}

### Learnings: need to engineer a different solution for the TickTimeData
###  currently, we need to store the tick themselves to be able to get the
###  tick updated events and update the current values of the ticks
###  This causes issues with managing too much memory and causes the store to be too big.

#type TickHourData @entity {
#  # format: <pool address>-<tick index>-<timestamp>
#  id: ID!
#  # unix timestamp for start of hour
#  periodStartUnix: Int!
#  # pointer to pool
#  pool: Pool!
#  # pointer to tick
#  tick: Tick!
#  # total liquidity pool has as tick lower or upper at end of period
#  liquidityGross: BigInt!
#  # how much liquidity changes when tick crossed at end of period
#  liquidityNet: BigInt!
#  # hourly volume of token0 with this tick in range
#  volumeToken0: BigDecimal!
#  # hourly volume of token1 with this tick in range
#  volumeToken1: BigDecimal!
#  # hourly volume in derived USD with this tick in range
#  volumeUSD: BigDecimal!
#  # fees in USD
#  feesUSD: BigDecimal!
#}

# Data accumulated and condensed into day stats for each exchange
# Note: this entity gets saved only if there is a change during the day
#type TickDayData @entity {
#  # format: <pool address>-<tick index>-<timestamp>
#  id: ID!
#  # timestamp rounded to current day by dividing by 86400
#  date: Int!
#  # pointer to pool
#  pool: Pool!
#  # pointer to tick
#  tick: Tick!
#  # total liquidity pool has as tick lower or upper at end of period
#  liquidityGross: BigInt!
#  # how much liquidity changes when tick crossed at end of period
#  liquidityNet: BigInt!
#  # hourly volume of token0 with this tick in range
#  volumeToken0: BigDecimal!
#  # hourly volume of token1 with this tick in range
#  volumeToken1: BigDecimal!
#  # hourly volume in derived USD with this tick in range
#  volumeUSD: BigDecimal!
#  # fees in USD
#  feesUSD: BigDecimal!
#  # vars needed for fee computation
#  feeGrowthOutside0X128: BigInt!
#  feeGrowthOutside1X128: BigInt!
#}

type TokenDayData @entity {
  # token address concatendated with date
  id: ID!
  # timestamp rounded to current day by dividing by 86400
  date: Int!
  # pointer to token
  token: Token!
  # volume in token units
  volume: BigDecimal!
  # volume in derived USD
  volumeUSD: BigDecimal!
  # volume in USD even on pools with less reliable USD values
  volumeUSDUntracked: BigDecimal!
  # liquidity across all pools in token units
  totalValueLocked: BigDecimal!
  # liquidity across all pools in derived USD
  totalValueLockedUSD: BigDecimal!
  # price at end of period in USD
  priceUSD: BigDecimal!
  # fees in USD
  feesUSD: BigDecimal!
  # opening price USD
  open: BigDecimal!
  # high price USD
  high: BigDecimal!
  # low price USD
  low: BigDecimal!
  # close price USD
  close: BigDecimal!
}

type TokenHourData @entity {
  # token address concatenated with date
  id: ID!
  # unix timestamp for start of hour
  periodStartUnix: Int!
  # pointer to token
  token: Token!
  # volume in token units
  volume: BigDecimal!
  # volume in derived USD
  volumeUSD: BigDecimal!
  # volume in USD even on pools with less reliable USD values
  volumeUSDUntracked: BigDecimal!
  # liquidity across all pools in token units
  totalValueLocked: BigDecimal!
  # liquidity across all pools in derived USD
  totalValueLockedUSD: BigDecimal!
  # price at end of period in USD
  priceUSD: BigDecimal!
  # fees in USD
  feesUSD: BigDecimal!
  # opening price USD
  open: BigDecimal!
  # high price USD
  high: BigDecimal!
  # low price USD
  low: BigDecimal!
  # close price USD
  close: BigDecimal!
}

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
      // executeQuery: {
      //   description: 'List three imaginary stocks that are trending.',
      //   parameters: z.object({
      //     stocks: z.array(
      //       z.object({
      //         symbol: z.string().describe('The symbol of the stock'),
      //         price: z.number().describe('The price of the stock'),
      //         delta: z.number().describe('The change in price of the stock')
      //       })
      //     )
      //   }),
      //   generate: async function* ({ stocks }) {
      //     yield (
      //       <BotCard>
      //         <StocksSkeleton />
      //       </BotCard>
      //     )

      //     let graphEndpoint = process.env['GRAPH_ENDPOINT']

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
      //               toolName: 'executeQuery',
      //               toolCallId,
      //               args: { stocks }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'executeQuery',
      //               toolCallId,
      //               result: stocks
      //             }
      //           ]
      //         }
      //       ]
      //     })

      //     return (
      //       <BotCard>
      //         <Stocks props={stocks} />
      //       </BotCard>
      //     )
      //   }
      // },
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
                    toolName: 'visualiseData',
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
                    toolName: 'visualiseData',
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

      executeRequest: {
        description:
          'Show the UI to execute a GraphQL request. Use this if the user wants to call the graph.',
        parameters: z.object({
          graphql_query: z
            .string()
            .describe(
              'GraphQL query that will be executed'
            )
            ,
          protocol: z
          .string().describe('The protocol thats being called.'),
          // numberOfShares: z
          //   .number()
          //   .describe(
          //     'The protocol that the user calls when asking for data'
          //   )
        }
        )
        ,
        generate: async function* ({ graphql_query, protocol }) {
          const toolCallId = nanoid()

          // if (numberOfShares <= 0 || numberOfShares > 1000) {
          //   aiState.done({
          //     ...aiState.get(),
          //     messages: [
          //       ...aiState.get().messages,
          //       {
          //         id: nanoid(),
          //         role: 'assistant',
          //         content: [
          //           {
          //             type: 'tool-call',
          //             toolName: 'executeRequest',
          //             toolCallId,
          //             args: { symbol, price, numberOfShares }
          //           }
          //         ]
          //       },
          //       {
          //         id: nanoid(),
          //         role: 'tool',
          //         content: [
          //           {
          //             type: 'tool-result',
          //             toolName: 'executeRequest',
          //             toolCallId,
          //             result: {
          //               symbol,
          //               price,
          //               numberOfShares,
          //               status: 'expired'
          //             }
          //           }
          //         ]
          //       },
          //       {
          //         id: nanoid(),
          //         role: 'system',
          //         content: `[User has selected an invalid amount]`
          //       }
          //     ]
          //   })

          //   return <BotMessage content={'Invalid amount'} />
          // } else
          {
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
                      toolName: 'executeRequest',
                      toolCallId,
                      args: { graphql_query, protocol }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'executeRequest',
                      toolCallId,
                      result: {
                        graphql_query, protocol
                      }
                    }
                  ]
                }
              ]
            })

            return (
              <BotCard>
                <Purchase
                  props={{
                    graphql_query,
                    protocol,
                    status: 'requires_action'
                  }}
                />
              </BotCard>
            )
          }
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
            return tool.toolName === 'executeQuery' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'visualiseData' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'executeRequest' ? (
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

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

  let graphEndpoint = graphEndpointS + ((protocol === 'Graph Network') ? 'DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp' :
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
    model: openai('gpt-4o-mini'),
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


"Graph Network subgraph that contains all the things subgraph"
    Schema:
    

    """
Graph Network global parameters and contract addresses
"""
type GraphNetwork @entity {
  "ID is set to 1"
  id: ID!
  "Controller address"
  controller: Bytes!
  "Graph token address"
  graphToken: Bytes!
  "Epoch manager address"
  epochManager: Bytes!
  "Epoch Manager implementations. Last in the array is current"
  epochManagerImplementations: [Bytes!]!
  "Curation address"
  curation: Bytes!
  "Curation implementations. Last in the array is current"
  curationImplementations: [Bytes!]!
  "Staking address"
  staking: Bytes!
  "Graph token implementations. Last in the array is current"
  stakingImplementations: [Bytes!]!
  "Dispute manager address"
  disputeManager: Bytes!
  "GNS address"
  gns: Bytes!
  "Service registry address"
  serviceRegistry: Bytes!
  "Rewards manager address"
  rewardsManager: Bytes!
  "Rewards Manager implementations. Last in the array is current"
  rewardsManagerImplementations: [Bytes!]!
  "True if the protocol is paused"
  isPaused: Boolean!
  "True if the protocol is partially paused"
  isPartialPaused: Boolean!
  "Governor of the controller (i.e. the whole protocol)"
  governor: Bytes!
  "Pause guardian address"
  pauseGuardian: Bytes!

  # Staking global parameters
  "Percentage of fees going to curators. In parts per million"
  curationPercentage: Int!
  "Percentage of fees burn as protocol fee. In parts per million"
  protocolFeePercentage: Int!
  "Ratio of max staked delegation tokens to indexers stake that earns rewards"
  delegationRatio: Int!
  "[DEPRECATED] Epochs to wait before fees can be claimed in rebate pool"
  channelDisputeEpochs: Int!
  "Epochs to wait before delegators can settle"
  maxAllocationEpochs: Int!
  "Time in blocks needed to wait to unstake"
  thawingPeriod: Int!
  "Minimum time an Indexer must use for resetting their Delegation parameters"
  delegationParametersCooldown: Int!
  "Minimum GRT an indexer must stake"
  minimumIndexerStake: BigInt!
  "Contracts that have been approved to be a slasher"
  slashers: [Bytes!]
  "Time in epochs a delegator needs to wait to withdraw delegated stake"
  delegationUnbondingPeriod: Int!
  "[DEPRECATED] Alpha in the cobbs douglas formula"
  rebateRatio: BigDecimal!
  "Alpha in the exponential formula"
  rebateAlpha: BigDecimal!
  "Lambda in the exponential formula"
  rebateLambda: BigDecimal!
  "Tax that delegators pay to deposit. In Parts per million"
  delegationTaxPercentage: Int!
  "Asset holder for the protocol"
  assetHolders: [Bytes!]

  # Transfers to L2 totals
  "Total amount of indexer stake transferred to L2"
  totalTokensStakedTransferredToL2: BigInt!
  "Total amount of delegated tokens transferred to L2"
  totalDelegatedTokensTransferredToL2: BigInt!
  "Total amount of delegated tokens transferred to L2"
  totalSignalledTokensTransferredToL2: BigInt!

  # Staking global aggregate values
  "The total amount of GRT staked in the staking contract"
  totalTokensStaked: BigInt!
  "NOT IMPLEMENTED - Total tokens that are settled and waiting to be claimed"
  totalTokensClaimable: BigInt! # TODO - see https://github.com/graphprotocol/graph-network-subgraph/issues/89
  "Total tokens that are currently locked or withdrawable in the network from unstaking"
  totalUnstakedTokensLocked: BigInt!
  "Total GRT currently in allocation"
  totalTokensAllocated: BigInt!
  "Total delegated tokens in the protocol"
  totalDelegatedTokens: BigInt!

  # Curation global aggregate values
  "The total amount of GRT signalled in the Curation contract"
  totalTokensSignalled: BigInt!
  "Total GRT currently curating via the Auto-Migrate function"
  totalTokensSignalledAutoMigrate: BigDecimal!
  "Total GRT currently curating to a specific version"
  totalTokensSignalledDirectly: BigDecimal!

  # Query fees globals
  "Total query fees generated in the network"
  totalQueryFees: BigInt!
  "Total query fees collected by indexers"
  totalIndexerQueryFeesCollected: BigInt!
  "Total query fees rebates claimed by indexers"
  totalIndexerQueryFeeRebates: BigInt!
  "Total query fees rebates claimed by delegators"
  totalDelegatorQueryFeeRebates: BigInt!
  "Total query fees payed to curators"
  totalCuratorQueryFees: BigInt!
  "Total protocol taxes applied to the query fees"
  totalTaxedQueryFees: BigInt!
  # It is hard to separate the unclaimed and rebates lost
  "Total unclaimed rebates. Includes unclaimed rebates, and rebates lost in rebates mechanism "
  totalUnclaimedQueryFeeRebates: BigInt!

  # Indexing rewards globals
  "Total indexing rewards minted"
  totalIndexingRewards: BigInt!
  "Total indexing rewards minted to Delegators"
  totalIndexingDelegatorRewards: BigInt!
  "Total indexing rewards minted to Indexers"
  totalIndexingIndexerRewards: BigInt!

  # Rewards manager global parameters
  "(Deprecated) The issuance rate of GRT per block before GIP-0037. To get annual rate do (networkGRTIssuance * 10^-18)^(blocksPerYear)"
  networkGRTIssuance: BigInt!
  "The issuance rate of GRT per block after GIP-0037. To get annual rate do (networkGRTIssuancePerBlock * blocksPerYear)"
  networkGRTIssuancePerBlock: BigInt!
  "Address of the availability oracle"
  subgraphAvailabilityOracle: Bytes!

  # Curation global parameters
  "Default reserve ratio for all subgraphs. In parts per million"
  defaultReserveRatio: Int!
  "Minimum amount of tokens needed to start curating"
  minimumCurationDeposit: BigInt!
  "The fee charged when a curator withdraws signal. In parts per million"
  curationTaxPercentage: Int!
  "Percentage of the GNS migration tax payed by the subgraph owner"
  ownerTaxPercentage: Int!

  # Graph Token global variables
  "Graph Token supply"
  totalSupply: BigInt!

  # TODO - implement these with uniswap
  "NOT IMPLEMENTED - Price of one GRT in USD"
  GRTinUSD: BigDecimal!
  "NOT IMPLEMENTED - Price of one GRT in ETH"
  GRTinETH: BigDecimal

  # Graph Token mint burn totals
  "Total amount of GRT minted"
  totalGRTMinted: BigInt!
  "Total amount of GRT burned"
  totalGRTBurned: BigInt!

  # Epoch manager global variables
  "Epoch Length in blocks"
  epochLength: Int!
  "Epoch that was last run"
  lastRunEpoch: Int!
  "Epoch when epoch length was last updated"
  lastLengthUpdateEpoch: Int!
  "Block when epoch length was last updated"
  lastLengthUpdateBlock: Int!
  "Current epoch the protocol is in"
  currentEpoch: Int!

  # Count aggregate values. Note, deprecated subgraphs or inactive users not removed from counts
  "Total indexers"
  indexerCount: Int!
  "Number of indexers that currently have some stake in the protocol"
  stakedIndexersCount: Int!
  "Total amount of delegators historically"
  delegatorCount: Int!
  "Total active delegators. Those that still have at least one active delegation."
  activeDelegatorCount: Int!
  "Total amount of delegations historically"
  delegationCount: Int!
  "Total active delegations. Those delegations that still have GRT staked towards an indexer"
  activeDelegationCount: Int!
  "Total amount of curators historically"
  curatorCount: Int!
  "Total amount of curators historically"
  activeCuratorCount: Int!
  "Total amount of Subgraph entities"
  subgraphCount: Int!
  "Amount of active Subgraph entities"
  activeSubgraphCount: Int!
  "Total amount of SubgraphDeployment entities"
  subgraphDeploymentCount: Int!
  "Total epochs"
  epochCount: Int!
  "Total amount of allocations opened"
  allocationCount: Int!
  "Total amount of allocations currently active"
  activeAllocationCount: Int!

  # Dispute Manager global variables
  "Dispute arbitrator"
  arbitrator: Bytes!
  "Penalty to Indexer on successful disputes for query disputes. In parts per million"
  querySlashingPercentage: Int!
  "Penalty to Indexer on successful disputes for indexing disputes. In parts per million"
  indexingSlashingPercentage: Int!
  "[DEPRECATED] Penalty to Indexer on successful disputes for indexing disputes. In parts per million"
  slashingPercentage: Int!
  "Minimum deposit to create a dispute"
  minimumDisputeDeposit: BigInt!
  "Reward to Fisherman on successful disputes. In parts per million"
  fishermanRewardPercentage: Int!

  # Bridge totals (Only available on L1 networks)
  "Total amount of GRT deposited to the L1 gateway. Note that the actual amount claimed in L2 might be lower due to tickets not redeemed."
  totalGRTDeposited: BigInt!
  "Total amount of GRT withdrawn from the L2 gateway and claimed in L1."
  totalGRTWithdrawnConfirmed: BigInt!
  "Total amount of GRT minted by L1 bridge"
  totalGRTMintedFromL2: BigInt!

  # Bridge totals (Only available on L2 networks)
  "Total amount of GRT deposited to the L1 gateway and redeemed in L2."
  totalGRTDepositedConfirmed: BigInt!
  "Total amount of GRT withdrawn from the L2 gateway. Note that the actual amount claimed in L1 might be lower due to outbound transactions not finalized."
  totalGRTWithdrawn: BigInt!
  "Block number for L1. Only implemented for L2 deployments to properly reflect the L1 block used for timings"
  currentL1BlockNumber: BigInt
}

"""
An account within the graph network. Contains metadata and all relevant data for this accounts
delegating, curating, and indexing.
"""
type GraphAccount @entity {
  "Graph account ID"
  id: ID!
  "All names this graph account has claimed from all name systems"
  names: [GraphAccountName!]! @derivedFrom(field: "graphAccount")
  "Default name the graph account has chosen"
  defaultName: GraphAccountName # Can optimize in future by checking ENS & others to make sure they still own the name
  "Time the account was created"
  createdAt: Int!
  "Default display name is the current default name. Used for filtered queries in the explorer"
  defaultDisplayName: String

  # IPFS Meta.
  metadata: GraphAccountMeta

  # Operator info
  "Operator of other Graph Accounts"
  operatorOf: [GraphAccount!]! @derivedFrom(field: "operators")
  "Operators of this Graph Accounts"
  operators: [GraphAccount!]!

  # GRT info
  "Graph token balance"
  balance: BigInt!
  "Balance received due to failed signal transfer from L1"
  balanceReceivedFromL1Signalling: BigInt!
  "Balance received due to failed delegation transfer from L1"
  balanceReceivedFromL1Delegation: BigInt!
  "Amount this account has approved staking to transfer their GRT"
  curationApproval: BigInt!
  "Amount this account has approved curation to transfer their GRT"
  stakingApproval: BigInt!
  "Amount this account has approved the GNS to transfer their GRT"
  gnsApproval: BigInt!

  # Subgraphs
  "Subgraphs the graph account owns"
  subgraphs: [Subgraph!]! @derivedFrom(field: "owner")
  "Time that this graph account became a developer"
  developerCreatedAt: Int
  "NOT IMPLEMENTED - Total query fees the subgraphs created by this account have accumulated in GRT"
  subgraphQueryFees: BigInt! # TODO - This is very hard to calculate, due to the many to one relationship between Subgraphs and SubgraphDeployments
  # Disputes
  "Disputes this graph account has created"
  createdDisputes: [Dispute!]! @derivedFrom(field: "fisherman")
  "Disputes against this graph account"
  disputesAgainst: [Dispute!]! @derivedFrom(field: "indexer")

  # Staking and Curating and Delegating
  "Curator fields for this GraphAccount. Null if never curated"
  curator: Curator
  "Indexer fields for this GraphAccount. Null if never indexed"
  indexer: Indexer
  "Delegator fields for this GraphAccount. Null if never delegated"
  delegator: Delegator

  # Transactions / activity feed
  "Name signal transactions created by this GraphAccount"
  nameSignalTransactions: [NameSignalTransaction!]! @derivedFrom(field: "signer")
  bridgeWithdrawalTransactions: [BridgeWithdrawalTransaction!]! @derivedFrom(field: "signer")
  bridgeDepositTransactions: [BridgeDepositTransaction!]! @derivedFrom(field: "signer")

  # Token Lock Wallets that this account is associated with
  tokenLockWallets: [TokenLockWallet!]!
}

type GraphAccountMeta @entity(immutable:true) {
  "IPFS hash with account metadata details"
  id: ID!
  "Account that reference this metadata file. For compatibility purposes. For the full list use graphAccounts"
  graphAccount: GraphAccount @derivedFrom(field:"metadata")
  "Accounts that reference this metadata file"
  graphAccounts: [GraphAccount!]! @derivedFrom(field:"metadata")
  "True if it is an organization. False if it is an individual"
  isOrganization: Boolean
  "Main repository of code for the graph account"
  codeRepository: String
  "Description of the graph account"
  description: String
  "Image URL"
  image: String
  "Website URL"
  website: String
  "Display name. Not unique"
  displayName: String
}

"""
A name chosen by a Graph Account from a Name System such as ENS. This allows Graph Accounts to be
recognized by name, rather than just an Ethereum address
"""
type GraphAccountName @entity {
  "Name system concatenated with the unique ID of the name system"
  id: ID!
  "Name system for this name"
  nameSystem: NameSystem!
  "Name from the system"
  name: String!
  "The graph account that owned the name when it was linked in the graph network"
  graphAccount: GraphAccount # May not match if the graph account proceeded to transfer away their name on that system
}

enum NameSystem {
  ENS
}

"""
The Subgraph entity represents a permanent, unique endpoint. This unique endpoint can resolve to
many different SubgraphVersions over it's lifetime. The Subgraph can also have a name attributed
to it. The owner of the Subgraph can only use a name once, thus making the owner account and the
name chosen a unique combination. When a Curator singals on a Subgraph, they receive "Name Signal".
"Name Signal" resolves into the underlying "Signal" of the SubgraphDeployment. The metadata of the
subgraph is stored on IPFS.
"""
type Subgraph @entity {
  "Subgraph ID - which is derived from the Organization/Individual graph accountID"
  id: ID!
  "Graph account that owns this subgraph"
  owner: GraphAccount!
  "Current version. Null if the subgraph is deprecated"
  currentVersion: SubgraphVersion
  "[DEPRECATED] Past versions. Has the same data as 'versions' but keeps the old naming for backwards compatibility"
  pastVersions: [SubgraphVersion!]! @derivedFrom(field: "subgraph")
  "List of all the subgraph versions included the current one"
  versions: [SubgraphVersion!]! @derivedFrom(field: "subgraph")
  "Version counter"
  versionCount: BigInt!
  "Creation timestamp"
  createdAt: Int!
  "Updated timestamp"
  updatedAt: Int!
  "Whether the subgraph is active or deprecated"
  active: Boolean!
  "Whether the subgraph has been claimed/migrated. Can only be false for subgraphs created with V1 contracts that have not been claimed/migrated"
  migrated: Boolean!
  "Whether the subgraph has been transferred from L1 to L2. Subgraphs published on L2 will have this as false unless they were published through a transfer"
  startedTransferToL2: Boolean!
  "Timestamp for the L1 -> L2 Transfer. Null if the transfer hasn't started yet"
  startedTransferToL2At: BigInt
  "Block number for the L1 -> L2 Transfer. Null if the transfer hasn't started yet"
  startedTransferToL2AtBlockNumber: BigInt
  "Transaction hash for the L1 -> L2 Transfer. Null if the transfer hasn't started yet"
  startedTransferToL2AtTx: String
  "Whether the subgraph has been fully transferred from L1 to L2. Subgraphs published on L2 will have this as false unless they were published through a transfer"
  transferredToL2: Boolean!
  "Timestamp for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2At: BigInt
  "Block number for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2AtBlockNumber: BigInt
  "Transaction hash for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2AtTx: String
  "Amount of GRT transferred to L2"
  signalledTokensSentToL2: BigInt!
  "Amount of GRT received on L2"
  signalledTokensReceivedOnL2: BigInt!
  "ID of the subgraph on L2. Null if it's not transferred"
  idOnL2: String
  "ID of the subgraph on L1. Null if it's not transferred"
  idOnL1: String
  "The actual ID of the subgraph on the contracts subgraph NFT implementation. BigInt represented as a String. It's only actually valid once the subgraph is migrated (migrated == true)"
  nftID: String
  "ID of the subgraph that was used on the old version of this The Graph Network Subgraph. Null for Subgraphs created with the new GNS implementation or for version 1 entities (since they use the old id)"
  oldID: String
  "Address used to create the ID. Only available for Subgraphs created pre-migration"
  creatorAddress: Bytes
  "Subgraph number used to create the ID. Only available for Subgraphs created pre-migration"
  subgraphNumber: BigInt
  "Auxiliary field to denote whether the subgraph is handling the initialization order on V2 events. Doesn't matter for V1 events."
  initializing: Boolean!
  "Version of the entity. Subgraph entities are changing the way their ID is generated when the new GNS v2 rolls out so we need to differnetiate them"
  entityVersion: Int!
  "[DEPRECATED] Used for duplicate entities to enable old IDs from before the subgraph NFT update"
  linkedEntity: Subgraph

  # Name curation data for bonding curve
  # Note that the Subgraphs V signal is actually stored in a Signal entity, which
  # considers the GNS as a Curator
  "CUMULATIVE signaled tokens on this subgraph all time"
  signalledTokens: BigInt!
  "CUMULATIVE unsignalled tokens on this subgraph all time"
  unsignalledTokens: BigInt!
  "CURRENT amount of tokens signalled on this subgraph latest version. Mirrors the total amount signalled towards the current deployment."
  currentSignalledTokens: BigInt!
  "The CURRENT name signal amount for this subgraph"
  nameSignalAmount: BigInt!
  "Current amount of version signal managed by the name pool"
  signalAmount: BigInt!
  "Reserve ratio of the name curation curve. In parts per million"
  reserveRatio: Int!
  "Tokens that can be withdrawn once the Subgraph is deprecated"
  withdrawableTokens: BigInt!
  "Tokens the curators have withdrawn from the deprecated Subgraph"
  withdrawnTokens: BigInt!
  "Curators of this subgraph deployment"
  nameSignals: [NameSignal!]! @derivedFrom(field: "subgraph")
  "Total amount of NameSignal entities"
  nameSignalCount: Int!

  # Meta from IPFS linked in GNS
  "Subgraph metadata"
  metadataHash: Bytes
  "Subgraph metadata ipfs hash and entity"
  metadata: SubgraphMeta

  # Auxiliary fields
  currentVersionRelationEntity: CurrentSubgraphDeploymentRelation
}

type SubgraphMeta @entity(immutable:true) {
  "Subgraph metadata ipfs hash"
  id: ID!
  "Subgraph that reference this metadata. For compatibility purposes. For the full list use subgraphs"
  subgraph: Subgraph @derivedFrom(field:"metadata")
  "Subgraphs that reference this metadata"
  subgraphs: [Subgraph!]! @derivedFrom(field:"metadata")
  "Short description of the subgraph"
  description: String
  "Image in string format"
  image: String
  "NFT Image representation"
  nftImage: String
  "Location of the code for this project"
  codeRepository: String
  "Projects website"
  website: String
  "Display name"
  displayName: String
  "Categories that the subgraph belongs to."
  categories: [String!]
}

type CurrentSubgraphDeploymentRelation @entity {
  "Auxiliary entity used to batch update Subgraph entities when signalling on the deployment changes. ID replicates the deployment ID and adds a counter, to make it easy to reproduce."
  id: ID!

  subgraph: Subgraph!

  deployment: SubgraphDeployment!

  "Indicates whether this relation is active. This means that the deployment is still the current deployment for the named Subgraph"
  active: Boolean!
}


"""
The SubgraphVersion entity represents a version of the Subgraph. A new SubgraphVersion is created
whenever there is an update to the Subgraph triggered by the owner. The new SubgraphVersion can
then point to a new SubgraphDeployment, thus allowing the Subgraph to resolve to a different
deployment, while keeping the same endpoint. The metadata and label are stored on IPFS. The label
is for the developer to provide a semantic version. This is different from the version, which is
just a counter than increases each time a new SubgraphVersion is created for a Subgraph.
"""
type SubgraphVersion @entity {
  "Concatenation of subgraph, subgraph deployment, and version ID"
  id: ID!
  "Subgraph of this version"
  subgraph: Subgraph!
  "Subgraph deployment of this version"
  subgraphDeployment: SubgraphDeployment!
  "Version number"
  version: Int!
  "Creation timestamp"
  createdAt: Int!

  metadataHash: Bytes
  # Meta from IPFS linked in GNS
  metadata: SubgraphVersionMeta

  entityVersion: Int!
  "[DEPRECATED] Used for duplicate entities to enable old IDs from before the subgraph NFT update"
  linkedEntity: SubgraphVersion
}

type SubgraphVersionMeta @entity(immutable:true) {
  "Subgraph version metadata ipfs hash"
  id: ID!
  "SubgraphVersion entity that references this metadata. For compatibility purposes. For the full list use subgraphVersions"
  subgraphVersion: SubgraphVersion @derivedFrom(field:"metadata")
  "SubgraphVersion entities that reference this metadata"
  subgraphVersions: [SubgraphVersion!]! @derivedFrom(field:"metadata")
  "Short description of the version"
  description: String
  "Semantic versioning label"
  label: String
}

"""
The SubgraphDeployment is represented by the immutable subgraph code that is uploaded, and posted
to IPFS. A SubgraphDeployment has a manifest which gives the instructions to the Graph Network on
what to index. The entity stores relevant data for the SubgraphDeployment on how much it is being
staked on and signaled on in the contracts, as well as how it is performing in query fees. It is
related to a SubgraphVersion.
"""
type SubgraphDeployment @entity {
  "Subgraph Deployment ID. The IPFS hash with Qm removed to fit into 32 bytes"
  id: ID!
  "IPFS hash of the subgraph manifest"
  ipfsHash: String!
  "The versions this subgraph deployment relates to"
  versions: [SubgraphVersion!]! @derivedFrom(field: "subgraphDeployment")
  "Creation timestamp"
  createdAt: Int!
  "The block at which this deployment was denied for rewards. Null if not denied"
  deniedAt: Int!
  "[DEPRECATED] The original Subgraph that was deployed through GNS. Can be null if never created through GNS. Used for filtering in the Explorer. Always null now"
  originalName: String

  # From Staking
  "CURRENT total stake of all indexers on this Subgraph Deployment"
  stakedTokens: BigInt!
  "Allocations created by indexers for this Subgraph"
  indexerAllocations: [Allocation!]! @derivedFrom(field: "subgraphDeployment")
  "Total rewards accrued all time by this Subgraph Deployment. Includes delegator and indexer rewards"
  indexingRewardAmount: BigInt!
  "Total rewards accrued all time by indexers"
  indexingIndexerRewardAmount: BigInt!
  "Total rewards accrued all time by delegators"
  indexingDelegatorRewardAmount: BigInt!
  "Total query fees earned by this Subgraph Deployment, without curator query fees"
  queryFeesAmount: BigInt!
  "Total query fee rebates earned from the protocol, through the rebates formula. Does not include delegation fees"
  queryFeeRebates: BigInt!
  "Total curator rewards from fees"
  curatorFeeRewards: BigInt!
  # TODO - We can add a field here for delegation fees earned when calling claim()

  # Subgraph deployment curation bonding curve
  "CURRENT signalled tokens in the bonding curve"
  signalledTokens: BigInt!
  "NOT IMPLEMENTED - CURRENT signalled tokens in the bonding curve"
  unsignalledTokens: BigInt! # Will be used for rewards
  "CURRENT curation signal for this subgraph deployment"
  signalAmount: BigInt!
  "signalledTokens / signalAmount"
  pricePerShare: BigDecimal!

  "Curators of this subgraph deployment"
  curatorSignals: [Signal!]! @derivedFrom(field: "subgraphDeployment")
  "Bonding curve reserve ratio. In parts per million"
  reserveRatio: Int!

  # From Subgraph Manifest
  # dataSources: [DataSource!]
  "Entity that represents the manifest of the deployment. Filled by File Data Sources"
  manifest: SubgraphDeploymentManifest

  # Counters for currentSignalledTokens tracking on Subgraph
  "Total amount of Subgraph entities that used this deployment at some point. subgraphCount >= activeSubgraphCount + deprecatedSubgraphCount"
  subgraphCount: Int!
  "Amount of active Subgraph entities that are currently using this deployment. Deprecated subgraph entities are not counted"
  activeSubgraphCount: Int!
  "Amount of Subgraph entities that were currently using this deployment when they got deprecated"
  deprecatedSubgraphCount: Int!

  "Whether the deployment has been transferred from L1 to L2. Subgraphs published on L2 will have this as false unless they were published through a transfer"
  transferredToL2: Boolean!
  "Timestamp for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2At: BigInt
  "Block number for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2AtBlockNumber: BigInt
  "Transaction hash for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2AtTx: String
  "Amount of GRT transferred to L2"
  signalledTokensSentToL2: BigInt!
  "Amount of GRT received on L2"
  signalledTokensReceivedOnL2: BigInt!
}

type SubgraphDeploymentSchema @entity(immutable:true) {
  "IPFS Hash"
  id: ID!
  "Link to a SubgraphDeploymentManifest entity that references this schema. For backwards compatibility purposes only, for the full list of manifests use manifests"
  manifest: SubgraphDeploymentManifest @derivedFrom(field:"schema")
  "Links to SubgraphDeploymentManifest entities that reference this schema"
  manifests: [SubgraphDeploymentManifest!]! @derivedFrom(field:"schema")
  "Contents of the Schema file"
  schema: String
}

type SubgraphDeploymentManifest @entity(immutable:true) {
  "IPFS Hash"
  id: ID!
  "Link to SubgraphDeployment entity"
  deployment: SubgraphDeployment @derivedFrom(field:"manifest")
  "Schema entity"
  schema: SubgraphDeploymentSchema
  "Schema ipfs hash"
  schemaIpfsHash: String
  "Contents of the Manifest file"
  manifest: String
  "Network where the contracts that the subgraph indexes are located"
  network: String
  "Whether the subgraph is a SpS/SbS. Null if we can't parse it"
  poweredBySubstreams: Boolean
  "Start block for the deployment. It's the lowest startBlock found (0 if some data source doesn't contain a start block)"
  startBlock: BigInt
}

# TODO - add when we have the ability to parse data sources
# """Data source obtained from the subgraph manifest"""
# type DataSource @entity {
#   "Unique identifier of the data source. Such as contract address"
#   id: ID!
#   "Data source name in the manifest"
#   name: String!
#   "Networks that the subgraph deployment is indexing"
#   networks: [String!]!
#   "Contract"
#   contract: Contract!
#   "ABI of the contract"
#   abi: String!
# }

# type Contract @entity {
#   "Address of the contract"
#   id: ID!
#   "Contract name"
#   name: String
# }

"""
Meta for the Indexer along with parameters and staking data
"""
type Indexer @entity {
  "Eth address of Indexer"
  id: ID!
  "Time this indexer was created"
  createdAt: Int!
  "Graph account of this indexer"
  account: GraphAccount!
  "Service registry URL for the indexer"
  url: String
  "Geohash of the indexer. Shows where their indexer is located in the world"
  geoHash: String
  "Default display name is the current default name. Used for filtered queries"
  defaultDisplayName: String

  # Staking data
  "CURRENT tokens staked in the protocol. Decreases on withdraw, not on lock"
  stakedTokens: BigInt!
  "CURRENT  tokens allocated on all subgraphs"
  allocatedTokens: BigInt!
  "NOT IMPLEMENTED - Tokens that have been unstaked and withdrawn"
  unstakedTokens: BigInt! # will be used for return % calcs
  "CURRENT tokens locked"
  lockedTokens: BigInt!
  "The block when the Indexers tokens unlock"
  tokensLockedUntil: Int!
  "Active allocations of stake for this Indexer"
  allocations: [Allocation!]! @derivedFrom(field: "activeForIndexer")
  "All allocations of stake for this Indexer (i.e. closed and active)"
  totalAllocations: [Allocation!]! @derivedFrom(field: "indexer")
  "Number of active allocations of stake for this Indexer"
  allocationCount: Int!
  "All allocations for this Indexer (i.e. closed and active)"
  totalAllocationCount: BigInt!
  "Total query fees collected. Includes the portion given to delegators"
  queryFeesCollected: BigInt!
  "Query fee rebate amount claimed from the protocol through rebates mechanism. Does not include portion given to delegators"
  queryFeeRebates: BigInt!
  "Total indexing rewards earned by this indexer from inflation. Including delegation rewards"
  rewardsEarned: BigInt!
  "The total amount of indexing rewards the indexer kept"
  indexerIndexingRewards: BigInt!
  "The total amount of indexing rewards given to delegators"
  delegatorIndexingRewards: BigInt!
  "Percentage of indexers' own rewards received in relation to its own stake. 1 (100%) means that the indexer is receiving the exact amount that is generated by his own stake"
  indexerRewardsOwnGenerationRatio: BigDecimal!
  "Whether the indexer has been transferred from L1 to L2 partially or fully"
  transferredToL2: Boolean!
  "Timestamp for the FIRST L1 -> L2 Transfer"
  firstTransferredToL2At: BigInt
  "Block number for the FIRST L1 -> L2 Transfer"
  firstTransferredToL2AtBlockNumber: BigInt
  "Transaction hash for the FIRST L1 -> L2 Transfer"
  firstTransferredToL2AtTx: String
  "Timestamp for the latest L1 -> L2 Transfer"
  lastTransferredToL2At: BigInt
  "Block number for the latest L1 -> L2 Transfer"
  lastTransferredToL2AtBlockNumber: BigInt
  "Transaction hash for the latest L1 -> L2 Transfer"
  lastTransferredToL2AtTx: String
  "Amount of GRT transferred to L2. Only visible from L1, as there's no events for it on L2"
  stakedTokensTransferredToL2: BigInt!
  "ID of the indexer on L2. Null if it's not transferred"
  idOnL2: String
  "ID of the indexer on L1. Null if it's not transferred"
  idOnL1: String

  # Capacity Data
  "Amount of delegated tokens that can be eligible for rewards"
  delegatedCapacity: BigInt!
  "Total token capacity = delegatedCapacity + stakedTokens"
  tokenCapacity: BigInt!
  "Stake available to earn rewards. tokenCapacity - allocationTokens - lockedTokens"
  availableStake: BigInt!

  # Delegation Pool
  "Delegators to this Indexer"
  delegators: [DelegatedStake!]! @derivedFrom(field: "indexer")
  "CURRENT tokens delegated to the indexer"
  delegatedTokens: BigInt!
  "Ratio between the amount of the indexers own stake over the total usable stake."
  ownStakeRatio: BigDecimal!
  "Ratio between the amount of delegated stake over the total usable stake."
  delegatedStakeRatio: BigDecimal!
  "Total shares of the delegator pool"
  delegatorShares: BigInt!
  "Exchange rate of of tokens received for each share"
  delegationExchangeRate: BigDecimal!
  "The percent of indexing rewards generated by the total stake that the Indexer keeps for itself. In parts per million"
  indexingRewardCut: Int!
  "The percent of indexing rewards generated by the delegated stake that the Indexer keeps for itself"
  indexingRewardEffectiveCut: BigDecimal!
  "The percent of reward dilution delegators experience because of overdelegation. Overdelegated stake can't be used to generate rewards but still gets accounted while distributing the generated rewards. This causes dilution of the rewards for the rest of the pool."
  overDelegationDilution: BigDecimal!
  "The total amount of query fees given to delegators"
  delegatorQueryFees: BigInt!
  "The percent of query rebate rewards the Indexer keeps for itself. In parts per million"
  queryFeeCut: Int!
  "The percent of query rebate rewards generated by the delegated stake that the Indexer keeps for itself"
  queryFeeEffectiveCut: BigDecimal!
  "Amount of blocks a delegator chooses for the waiting period for changing their params"
  delegatorParameterCooldown: Int!
  "Block number for the last time the delegator updated their parameters"
  lastDelegationParameterUpdate: Int!
  "Count of how many times this indexer has been forced to close an allocation"
  forcedClosures: Int!

  # Metrics
  "NOT IMPLEMENTED - Total return this indexer has earned"
  totalReturn: BigDecimal!
  "NOT IMPLEMENTED - Annualized rate of return for the indexer"
  annualizedReturn: BigDecimal! # You must multiple by 100 to get percentage
  "NOT IMPLEMENTED - Staking efficiency of the indexer"
  stakingEfficiency: BigDecimal!
}

"""
A state channel Allocation representing a single Indexer-SubgraphDeployment stake
"""
type Allocation @entity {
  "Channel Address"
  id: ID!
  "Indexer of this allocation"
  indexer: Indexer!
  "Creator of the allocation - can be the operator or the indexer"
  creator: Bytes!
  "If the Allocation is active it shows the indexer. If closed, it is null"
  activeForIndexer: Indexer
  "Subgraph deployment that is being allocated to"
  subgraphDeployment: SubgraphDeployment!
  "Tokens allocation in this allocation"
  allocatedTokens: BigInt!
  "[DEPRECATED] Effective allocation that is realized upon closing"
  effectiveAllocation: BigInt!
  "Epoch this allocation was created"
  createdAtEpoch: Int!
  "Block at which this allocation was created"
  createdAtBlockHash: Bytes!
  "Block number at which this allocation was created"
  createdAtBlockNumber: Int!
  "Epoch this allocation was closed in"
  closedAtEpoch: Int
  "Block hash at which this allocation was closed"
  closedAtBlockHash: Bytes
  "Block number at which this allocation was closed"
  closedAtBlockNumber: Int
  "Fees this allocation collected from query fees upon closing. Excludes curator reward and protocol tax"
  queryFeesCollected: BigInt!
  "Query fee rebate amount claimed from the protocol through rebates mechanism. Does not include portion given to delegators"
  queryFeeRebates: BigInt!
  "Query fee rebates collected from the protocol. Can differ from queryFeeRebates if multiple vouchers per allocation are allowed."
  distributedRebates: BigInt!
  "Curator rewards deposited to the curating bonding curve"
  curatorRewards: BigInt!
  "Indexing rewards earned by this allocation. Includes delegator and indexer rewards"
  indexingRewards: BigInt!
  "Indexing rewards earned by this allocation by indexers"
  indexingIndexerRewards: BigInt!
  "Indexing rewards earned by this allocation by delegators"
  indexingDelegatorRewards: BigInt!
  "[DEPRECATED] Pool in which this allocation was closed"
  poolClosedIn: Pool
  "Fees paid out to delegators"
  delegationFees: BigInt!
  "Status of the allocation"
  status: AllocationStatus!
  "Timestamp this allocation was created at"
  createdAt: Int!
  "Timestamp this allocation was closed at"
  closedAt: Int
  "POI submitted with a closed allocation"
  poi: Bytes

  # Indexer cut settings at start and close
  indexingRewardCutAtStart: Int!
  indexingRewardEffectiveCutAtStart: BigDecimal!
  queryFeeCutAtStart: Int!
  queryFeeEffectiveCutAtStart: BigDecimal!

  indexingRewardCutAtClose: Int
  indexingRewardEffectiveCutAtClose: BigDecimal
  queryFeeCutAtClose: Int
  queryFeeEffectiveCutAtClose: BigDecimal

  # Metrics NOT IMPLEMENTED YET
  "NOT IMPLEMENTED - Return for this allocation"
  totalReturn: BigDecimal!
  "NOT IMPLEMENTED - Yearly annualzied return"
  annualizedReturn: BigDecimal!
}

enum AllocationStatus {
  Null # == indexer == address(0)
  Active # == not Null && tokens > 0 #
  Closed # == Active && closedAtEpoch != 0. Still can collect, while you are waiting to be finalized. a.k.a settling
  Finalized # == [DEPRECATED] Closing && closedAtEpoch + channelDisputeEpochs > now(). Note, the subgraph has no way to return this value. it is implied
  Claimed # == [DEPRECATED] not Null && tokens == 0 - i.e. finalized, and all tokens withdrawn
}

"""
[DEPRECATED] Global pool of query fees for closed state channels. Each Epoch has a single pool,
hence why they share the same IDs.
"""
type Pool @entity {
  "Epoch number of the pool"
  id: ID!
  "Total effective allocation tokens from all allocations closed in this epoch"
  allocation: BigInt!
  "Total query fees collected in this epoch"
  totalQueryFees: BigInt!
  "Total query fees claimed in this epoch. Can be smaller than totalFees because of rebates function "
  claimedFees: BigInt!
  "Total rewards from query fees deposited to all curator bonding curves during the epoch"
  curatorRewards: BigInt!
  "Allocations that were closed during this epoch"
  closedAllocations: [Allocation!]! @derivedFrom(field: "poolClosedIn")
}

"""
Delegator with all their delegated stakes towards Indexers
"""
type Delegator @entity {
  "Delegator address"
  id: ID!
  "Graph account of the delegator"
  account: GraphAccount!
  "Stakes of this delegator"
  stakes: [DelegatedStake!]! @derivedFrom(field: "delegator")
  "CUMULATIVE staked tokens in DelegatorStakes of this Delegator"
  totalStakedTokens: BigInt!
  "CUMULATIVE unstaked tokens in DelegatorStakes of this Delegator"
  totalUnstakedTokens: BigInt!
  "Time created at"
  createdAt: Int!
  "Total realized rewards on all delegated stakes. Realized rewards are added when undelegating and realizing a profit"
  totalRealizedRewards: BigDecimal!

  "Total DelegatedStake entity count (Active and inactive)"
  stakesCount: Int!
  "Active DelegatedStake entity count. Active means it still has GRT delegated"
  activeStakesCount: Int!

  "Default display name is the current default name. Used for filtered queries"
  defaultDisplayName: String
}

"""
Delegator stake for a single Indexer
"""
type DelegatedStake @entity {
  "Concatenation of Delegator address and Indexer address"
  id: ID!
  "Index the stake is delegated to"
  indexer: Indexer!
  "Delegator"
  delegator: Delegator!
  "CUMULATIVE tokens delegated"
  stakedTokens: BigInt!
  "CUMULATIVE tokens undelegated"
  unstakedTokens: BigInt!
  "CURRENT tokens locked"
  lockedTokens: BigInt!
  "Epoch the locked tokens get unlocked"
  lockedUntil: Int!
  "Shares owned in the delegator pool. Used to calculate total amount delegated"
  shareAmount: BigInt!
  "The rate this delegator paid for their shares (calculated using average cost basis). Used for rewards calculations"
  personalExchangeRate: BigDecimal!
  "Realized rewards from undelegating and realizing a reward"
  realizedRewards: BigDecimal!
  "Time this delegator first delegated to an indexer"
  createdAt: Int!
  "Last time this delegator delegated towards this indexer"
  lastDelegatedAt: Int
  "Last time this delegator undelegated from this indexer"
  lastUndelegatedAt: Int
  "Whether the delegation has been transferred from L1 to L2"
  transferredToL2: Boolean!
  "Timestamp for the L1 -> L2 Transfer"
  transferredToL2At: BigInt
  "Block number for the L1 -> L2 Transfer"
  transferredToL2AtBlockNumber: BigInt
  "Transaction hash for the L1 -> L2 Transfer"
  transferredToL2AtTx: String
  "Amount of GRT transferred to L2. Only visible from L1, as there's no events for it on L2"
  stakedTokensTransferredToL2: BigInt!
  "ID of the delegation on L2. Null if it's not transferred"
  idOnL2: String
  "ID of the delegation on L1. Null if it's not transferred"
  idOnL1: String
}

"""
Curator with all Signals and metrics
"""
type Curator @entity {
  "Eth address of the Curator"
  id: ID!
  "Time this curator was created"
  createdAt: Int!
  "Graph account of this curator"
  account: GraphAccount!
  "CUMULATIVE tokens signalled on all the subgraphs"
  totalSignalledTokens: BigInt!
  "CUMULATIVE tokens unsignalled on all the subgraphs"
  totalUnsignalledTokens: BigInt!
  "Subgraphs the curator is curating"
  signals: [Signal!]! @derivedFrom(field: "curator")
  "Default display name is the current default name. Used for filtered queries"
  defaultDisplayName: String

  "CUMULATIVE tokens signalled on all names"
  totalNameSignalledTokens: BigInt!
  "CUMULATIVE tokens unsignalled on all names"
  totalNameUnsignalledTokens: BigInt!
  "CUMULATIVE withdrawn tokens from deprecated subgraphs"
  totalWithdrawnTokens: BigInt!
  "Subgraphs the curator is curating"
  nameSignals: [NameSignal!]! @derivedFrom(field: "curator")

  # Metrics NOTE - will be hard to calculate these with the two types of signal
  "NOT IMPLEMENTED - Summation of realized rewards from all Signals"
  realizedRewards: BigInt!
  "NOT IMPLEMENTED - Annualized rate of return on curator signal"
  annualizedReturn: BigDecimal!
  "NOT IMPLEMENTED - Total return of the curator"
  totalReturn: BigDecimal!
  "NOT IMPLEMENTED - Signaling efficiency of the curator"
  signalingEfficiency: BigDecimal!

  "CURRENT summed name signal for all bonding curves"
  totalNameSignal: BigDecimal!
  "Total curator cost basis of all shares of name pools purchased on all bonding curves"
  totalNameSignalAverageCostBasis: BigDecimal!
  "totalNameSignalAverageCostBasis / totalNameSignal"
  totalAverageCostBasisPerNameSignal: BigDecimal!
  "CURRENT summed signal for all bonding curves"
  totalSignal: BigDecimal!
  "Total curator cost basis of all version signal shares purchased on all bonding curves. Includes those purchased through GNS name pools"
  totalSignalAverageCostBasis: BigDecimal!
  "totalSignalAverageCostBasis / totalSignal"
  totalAverageCostBasisPerSignal: BigDecimal!

  # Curation counters
  "Total amount of signals created by this user"
  signalCount: Int!
  "Amount of active signals for this user"
  activeSignalCount: Int!
  "Total amount of name signals created by this user"
  nameSignalCount: Int!
  "Amount of active name signals for this user"
  activeNameSignalCount: Int!
  "Total amount of name signals and signals created by this user. signalCount + nameSignalCount"
  combinedSignalCount: Int!
  "Amount of active name signals and signals for this user. signalCount + nameSignalCount"
  activeCombinedSignalCount: Int!
}

"""
Curator Signal for a single SubgraphDeployment
"""
type Signal @entity {
  "Eth address + subgraph deployment ID"
  id: ID!
  "Eth address of the curator"
  curator: Curator!
  "Subgraph being signalled"
  subgraphDeployment: SubgraphDeployment!
  "CUMULATIVE number of tokens the curator has signalled"
  signalledTokens: BigInt!
  "CUMULATIVE number of tokens the curator has unsignalled"
  unsignalledTokens: BigInt!
  "Signal that the curator has from signaling their GRT"
  signal: BigInt!
  "Curator average cost basis for this signal on this subgraph"
  averageCostBasis: BigDecimal!
  "averageCostBasis / signal"
  averageCostBasisPerSignal: BigDecimal!

  # Metrics
  "Block for which the curator last entered or exited the curve"
  lastSignalChange: Int!
  # These are summed up and added whenever curator enters or exists the curve. Then we must calculate
  # unrealized gains for their current balance, based on the time since the last exit/entry of the curve
  "Summation of realized rewards from before the last time the curator entered the curation curve"
  realizedRewards: BigInt!

  "Timetamp when this entity was created"
  createdAt: Int!
  "Timetamp when this entity was last updated"
  lastUpdatedAt: Int!
  "Block number where this entity was created"
  createdAtBlock: Int!
  "Block number where this entity was last updated"
  lastUpdatedAtBlock: Int!
}

"""
Curator Name Signal for a single Subgraph
"""
type NameSignal @entity {
  "Eth address + subgraph ID"
  id: ID!
  "Eth address of the curator"
  curator: Curator!
  "Subgraph being signalled"
  subgraph: Subgraph!
  "CUMULATIVE number of tokens the curator has signalled"
  signalledTokens: BigInt!
  "CUMULATIVE number of tokens the curator has unsignalled"
  unsignalledTokens: BigInt!
  "Tokens the curator has withdrawn from a deprecated name curve"
  withdrawnTokens: BigInt!
  "Shares of the name pool (GNS) that the curator has from signaling their GRT"
  nameSignal: BigInt!
  "Actual signal shares that the name pool minted with the GRT provided by the curator"
  signal: BigDecimal!
  "Amount of GRT transferred to L2"
  signalledTokensSentToL2: BigInt!
  "Amount of GRT received on L2"
  signalledTokensReceivedOnL2: BigInt!
  "Whether the name signal has been transferred from L1 to L2. Only applies to NameSignals that have been transferred, native L2 NameSignal entities will return false"
  transferredToL2: Boolean!
  "Timestamp for the L1 -> L2 Transfer."
  transferredToL2At: BigInt
  "Block number for the L1 -> L2 Transfer."
  transferredToL2AtBlockNumber: BigInt
  "Transaction hash for the L1 -> L2 Transfer."
  transferredToL2AtTx: String
  "ID of the NameSignal entity on L2. Null if it's not transferred"
  idOnL2: String
  "ID of the NameSignal entity on L1. Null if it's not transferred"
  idOnL1: String

  # Metrics
  "Block for which the curator last entered or exited the curve"
  lastNameSignalChange: Int!
  # These are summed up and added whenever curator enters or exists the curve. Then we must calculate
  # unrealized gains for their current balance, based on the time since the last exit/entry of the curve
  "Summation of realized rewards from before the last time the curator entered the curation curve"
  realizedRewards: BigInt!

  "[DEPRECATED] Curator average cost basis for this name signal on this subgraph. New field for further versions will be nameSignalAverageCostBasis"
  averageCostBasis: BigDecimal! # note this is ONLY name signal. This is okay for the protocol for now
  "[DEPRECATED] nameSignalAverageCostBasis / nameSignal. New field for further versions will be nameSignalAverageCostBasisPerSignal"
  averageCostBasisPerSignal: BigDecimal!

  "Curator average cost basis for this name signal on this subgraph"
  nameSignalAverageCostBasis: BigDecimal! # note this is ONLY name signal. This is okay for the protocol for now
  "nameSignalAverageCostBasis / nameSignal"
  nameSignalAverageCostBasisPerSignal: BigDecimal!

  "Curator average cost basis for the version signal on this subgraph name pool"
  signalAverageCostBasis: BigDecimal!
  "signalAverageCostBasis / signal"
  signalAverageCostBasisPerSignal: BigDecimal!

  entityVersion: Int!
  "[DEPRECATED] Used for duplicate entities to enable old IDs from before the subgraph NFT update"
  linkedEntity: NameSignal
}

"""
Auxiliary entity to be able to batch update NameSignal entities
"""
type NameSignalSubgraphRelation @entity {
  "Subgraph ID + index"
  id: ID!

  nameSignal: NameSignal!

  subgraph: Subgraph!
}

"""
Dispute of a query. Includes single query, conflicting attestation, and indexing disputes
"""
type Dispute @entity {
  "Dispute ID"
  id: ID!
  "Subgraph deployment being disputed"
  subgraphDeployment: SubgraphDeployment!
  "Fisherman address"
  fisherman: GraphAccount!
  "Fisherman deposit"
  deposit: BigInt!

  "Time dispute was created"
  createdAt: Int!
  "Time dispute was closed at"
  closedAt: Int!
  "Status of the dispute. Accepted means the Indexer was slashed"
  status: DisputeStatus!
  "Total amount of tokens slashed on the dispute"
  tokensSlashed: BigDecimal!
  "Amount of the slashed tokens that was burned"
  tokensBurned: BigDecimal!
  "Amount of the slashed tokens that was payed as reward to the fisherman"
  tokensRewarded: BigInt!

  # Type specific data
  "Type of dispute"
  type: DisputeType!
  "Indexer disputed"
  indexer: GraphAccount!
  "Attestation. Only for single query and conflicting attestations"
  attestation: Attestation
  "Linked dispute of other Indexer. Only for conflicting attestation"
  linkedDispute: Dispute
  "Allocation ID. Only for Indexing Disputes"
  allocation: Allocation
}

"""
Attestation of a dispute
"""
type Attestation @entity {
  "Concatenation of the requestCID and responseCID"
  id: ID!
  "Subgraph deployment being disputed"
  subgraphDeployment: SubgraphDeployment!
  "RequestCID"
  requestCID: String!
  "ResponseCID"
  responseCID: String!
  "NOT IMPLEMENTED - Gas used by the attested query"
  gasUsed: BigInt # Get from Allocation metadata when available
  "NOT IMPLEMENTED - Bytes of attested query"
  responseNumBytes: BigInt # Get from Allocation metadata when available
  "V of the indexers signature"
  v: Int!
  "R of the indexers signature"
  r: String!
  "S of the indexers signature"
  s: String!
}

enum DisputeType {
  SingleQuery
  Conflicting
  Indexing
}

enum DisputeStatus {
  Undecided
  Accepted
  Rejected
  Draw
}

"""
Epoch aggregate data for network statistics on signaling, rewards, and query fees
"""
type Epoch @entity {
  "Epoch number"
  id: ID!
  "Start block of the epoch"
  startBlock: Int!
  "End block of the epoch"
  endBlock: Int!
  "Signaled tokens during this epoch"
  signalledTokens: BigInt!
  "Stake deposited during this epoch"
  stakeDeposited: BigInt!
  "Total amount of query fees generated during this epoch (Includes everything)"
  totalQueryFees: BigInt!
  "Amount of query fees generated that were burnt by the 1% protocol tax during this epoch"
  taxedQueryFees: BigInt!
  "Amount of query fees generated for indexers during this epoch"
  queryFeesCollected: BigInt!
  "Amount of query fees generated that are going to curators during this epoch"
  curatorQueryFees: BigInt!
  "Rebate amount claimed from the protocol through rebates mechanism during this epoch"
  queryFeeRebates: BigInt!
  "Total indexing rewards earned in this epoch. Includes both delegator and indexer rewards"
  totalRewards: BigInt!
  "Total indexing rewards earned in this epoch by indexers"
  totalIndexerRewards: BigInt!
  "Total indexing rewards earned in this epoch by delegators"
  totalDelegatorRewards: BigInt!
}

"""
A generic transaction in The Graph Network
"""
interface Transaction {
  "Transaction hash concatenated with event log index"
  id: ID!
  "Block number for the transaction"
  blockNumber: Int!
  "Timestamp for the transaction"
  timestamp: Int!
  "Signer of the transaction"
  signer: GraphAccount!
  "Type of Graph Network transaction"
  type: TransactionType!
  # TODO - add epoch number,
}

"""
All relevant data for a Name Signal Transaction in The Graph Network
"""
type NameSignalTransaction implements Transaction @entity {
  id: ID!
  blockNumber: Int!
  timestamp: Int!
  signer: GraphAccount!
  type: TransactionType!
  "Amount of name signal updated"
  nameSignal: BigInt!
  "Amount of version signal updated"
  versionSignal: BigInt!
  "Tokens used"
  tokens: BigInt!
  "Subgraph where name signal was updated"
  subgraph: Subgraph!
}

"""
All relevant data for a Signal Transaction in The Graph Network
"""
type SignalTransaction implements Transaction @entity {
  id: ID!
  blockNumber: Int!
  timestamp: Int!
  signer: GraphAccount!
  type: TransactionType!
  "Amount of signal updated"
  signal: BigInt!
  "Tokens used"
  tokens: BigInt!
  "Subgraph where signal was updated"
  subgraphDeployment: SubgraphDeployment!
  "Withdrawal fees. On minting only"
  withdrawalFees: BigInt!
}

"""
All relevant data for a bridge withdrawal Transaction in The Graph Network
"""
type BridgeWithdrawalTransaction implements Transaction @entity {
  id: ID!
  blockNumber: Int!
  timestamp: Int!
  signer: GraphAccount!
  type: TransactionType!
  "txHash refers to the tx on the chain corresponding to this subgraph deployment"
  txHash: Bytes
  from: Bytes
  to: Bytes
  amount: BigInt
  l1Token: Bytes
  "transactionIndex is the unique value that allows matching an L2 transaction with its L1 counterpart"
  transactionIndex: BigInt
}

"""
All relevant data for a bridge deposit Transaction in The Graph Network
"""
type BridgeDepositTransaction implements Transaction @entity {
  id: ID!
  blockNumber: Int!
  timestamp: Int!
  signer: GraphAccount!
  type: TransactionType!
  "txHash refers to the tx on the chain corresponding to this subgraph deployment"
  txHash: Bytes!
  from: Bytes
  to: Bytes
  amount: BigInt
  l1Token: Bytes
  "retryableTicketId is the unique value that allows matching an L2 transaction with its L1 counterpart"
  retryableTicketId: String
  "Whether the deposit was initiated through Arbitrum's gateway router (Only available on L1 networks)"
  routed: Boolean
}

"""
All relevant data for arbitrum retryable tickets
"""
type RetryableTicket @entity {
  id: ID!
  "hash of the retryable ticket creation transaction"
  txHash: Bytes
  redeemAttempts: [RetryableTicketRedeemAttempt!]! @derivedFrom(field: "ticketId")
  "The amount of times the ticket has been scheduled for redeeming"
  redeemCount: Int
}

type RetryableTicketRedeemAttempt @entity {
  id: ID!
  ticketId: RetryableTicket!
  txHash: Bytes
  sequenceNumber: Int
}

enum TransactionType {
  Stake
  Unstake
  MintSignal
  BurnSignal
  MintNSignal
  BurnNSignal
  BridgeWithdrawal
  BridgeDeposit
}

"""
The Token manager data
"""
type TokenManager @entity {
  "Token manager address"
  id: ID!
  "Master copy address"
  masterCopy: Bytes!
  "Tokens stored in manger through deposit or withdraw"
  tokens: BigInt!
  "List of addresses that are allowed to pull funds"
  tokenDestinations: [Bytes!]
  "List of function call authorizations"
  authorizedFunctions: [AuthorizedFunction!] @derivedFrom(field: "manager")
  "Token lock count of contracts created"
  tokenLockCount: BigInt!
}

"""
Authorized functions for the Manager
"""
type AuthorizedFunction @entity {
  "Function signature (string)"
  id: ID!
  "The contract address that is authorized to have this function called on itself"
  target: Bytes!
  "Hash of the function signature"
  sigHash: Bytes!
  "Token lock Manager"
  manager: TokenManager!
}
"""
Token Lock Wallets which hold locked GRT
"""
type TokenLockWallet @entity {
  "The address of the token lock wallet"
  id: ID!
  "The Manager address"
  manager: Bytes!
  "The hash of the initializer"
  initHash: Bytes!
  "Address of the beneficiary of locked tokens"
  beneficiary: Bytes!
  "The token being used (GRT)"
  token: Bytes!
  "Amount of tokens to be managed by the lock contract"
  managedAmount: BigInt!
  "Start time of the release schedule"
  startTime: BigInt!
  "End time of the release schedule"
  endTime: BigInt!
  "Number of periods between start time and end time"
  periods: BigInt!
  "Time when the releases start"
  releaseStartTime: BigInt!
  "Time the cliff vests, 0 if no cliff"
  vestingCliffTime: BigInt!
  "Whether or not the contract is revocable"
  revocable: Revocability
  "True if the beneficiary has approved addresses that the manager has approved"
  tokenDestinationsApproved: Boolean!
  "The amount of tokens that have been resleased"
  tokensReleased: BigInt!
  "The amount of tokens that have been withdrawn"
  tokensWithdrawn: BigInt!
  "The amount of tokens that have been revoked"
  tokensRevoked: BigInt!
  "The block this wlalet was created"
  blockNumberCreated: BigInt!
  "The creation tx hash of the wallet"
  txHash: Bytes!
}

"""
TokenLockWallet Revocability Enum
"""
enum Revocability {
  NotSet
  Enabled
  Disabled
}

"""
Full test search for displayName and description on the Subgraph Entity
"""
type _Schema_
  @fulltext(
    name: "subgraphMetadataSearch"
    language: en
    algorithm: rank
    include: [{ entity: "SubgraphMeta", fields: [{ name: "displayName" }, { name: "description" }] }]
  )
  @fulltext(
    name: "curatorSearch"
    language: en
    algorithm: rank
    include: [{ entity: "Curator", fields: [{ name: "defaultDisplayName" }, { name: "id" }] }]
  )
  @fulltext(
    name: "delegatorSearch"
    language: en
    algorithm: rank
    include: [{ entity: "Delegator", fields: [{ name: "defaultDisplayName" }, { name: "id" }] }]
  )
"""
Graph Network global parameters and contract addresses
"""
type GraphNetwork @entity {
  "ID is set to 1"
  id: ID!
  "Controller address"
  controller: Bytes!
  "Graph token address"
  graphToken: Bytes!
  "Epoch manager address"
  epochManager: Bytes!
  "Epoch Manager implementations. Last in the array is current"
  epochManagerImplementations: [Bytes!]!
  "Curation address"
  curation: Bytes!
  "Curation implementations. Last in the array is current"
  curationImplementations: [Bytes!]!
  "Staking address"
  staking: Bytes!
  "Graph token implementations. Last in the array is current"
  stakingImplementations: [Bytes!]!
  "Dispute manager address"
  disputeManager: Bytes!
  "GNS address"
  gns: Bytes!
  "Service registry address"
  serviceRegistry: Bytes!
  "Rewards manager address"
  rewardsManager: Bytes!
  "Rewards Manager implementations. Last in the array is current"
  rewardsManagerImplementations: [Bytes!]!
  "True if the protocol is paused"
  isPaused: Boolean!
  "True if the protocol is partially paused"
  isPartialPaused: Boolean!
  "Governor of the controller (i.e. the whole protocol)"
  governor: Bytes!
  "Pause guardian address"
  pauseGuardian: Bytes!

  # Staking global parameters
  "Percentage of fees going to curators. In parts per million"
  curationPercentage: Int!
  "Percentage of fees burn as protocol fee. In parts per million"
  protocolFeePercentage: Int!
  "Ratio of max staked delegation tokens to indexers stake that earns rewards"
  delegationRatio: Int!
  "[DEPRECATED] Epochs to wait before fees can be claimed in rebate pool"
  channelDisputeEpochs: Int!
  "Epochs to wait before delegators can settle"
  maxAllocationEpochs: Int!
  "Time in blocks needed to wait to unstake"
  thawingPeriod: Int!
  "Minimum time an Indexer must use for resetting their Delegation parameters"
  delegationParametersCooldown: Int!
  "Minimum GRT an indexer must stake"
  minimumIndexerStake: BigInt!
  "Contracts that have been approved to be a slasher"
  slashers: [Bytes!]
  "Time in epochs a delegator needs to wait to withdraw delegated stake"
  delegationUnbondingPeriod: Int!
  "[DEPRECATED] Alpha in the cobbs douglas formula"
  rebateRatio: BigDecimal!
  "Alpha in the exponential formula"
  rebateAlpha: BigDecimal!
  "Lambda in the exponential formula"
  rebateLambda: BigDecimal!
  "Tax that delegators pay to deposit. In Parts per million"
  delegationTaxPercentage: Int!
  "Asset holder for the protocol"
  assetHolders: [Bytes!]

  # Transfers to L2 totals
  "Total amount of indexer stake transferred to L2"
  totalTokensStakedTransferredToL2: BigInt!
  "Total amount of delegated tokens transferred to L2"
  totalDelegatedTokensTransferredToL2: BigInt!
  "Total amount of delegated tokens transferred to L2"
  totalSignalledTokensTransferredToL2: BigInt!

  # Staking global aggregate values
  "The total amount of GRT staked in the staking contract"
  totalTokensStaked: BigInt!
  "NOT IMPLEMENTED - Total tokens that are settled and waiting to be claimed"
  totalTokensClaimable: BigInt! # TODO - see https://github.com/graphprotocol/graph-network-subgraph/issues/89
  "Total tokens that are currently locked or withdrawable in the network from unstaking"
  totalUnstakedTokensLocked: BigInt!
  "Total GRT currently in allocation"
  totalTokensAllocated: BigInt!
  "Total delegated tokens in the protocol"
  totalDelegatedTokens: BigInt!

  # Curation global aggregate values
  "The total amount of GRT signalled in the Curation contract"
  totalTokensSignalled: BigInt!
  "Total GRT currently curating via the Auto-Migrate function"
  totalTokensSignalledAutoMigrate: BigDecimal!
  "Total GRT currently curating to a specific version"
  totalTokensSignalledDirectly: BigDecimal!

  # Query fees globals
  "Total query fees generated in the network"
  totalQueryFees: BigInt!
  "Total query fees collected by indexers"
  totalIndexerQueryFeesCollected: BigInt!
  "Total query fees rebates claimed by indexers"
  totalIndexerQueryFeeRebates: BigInt!
  "Total query fees rebates claimed by delegators"
  totalDelegatorQueryFeeRebates: BigInt!
  "Total query fees payed to curators"
  totalCuratorQueryFees: BigInt!
  "Total protocol taxes applied to the query fees"
  totalTaxedQueryFees: BigInt!
  # It is hard to separate the unclaimed and rebates lost
  "Total unclaimed rebates. Includes unclaimed rebates, and rebates lost in rebates mechanism "
  totalUnclaimedQueryFeeRebates: BigInt!

  # Indexing rewards globals
  "Total indexing rewards minted"
  totalIndexingRewards: BigInt!
  "Total indexing rewards minted to Delegators"
  totalIndexingDelegatorRewards: BigInt!
  "Total indexing rewards minted to Indexers"
  totalIndexingIndexerRewards: BigInt!

  # Rewards manager global parameters
  "(Deprecated) The issuance rate of GRT per block before GIP-0037. To get annual rate do (networkGRTIssuance * 10^-18)^(blocksPerYear)"
  networkGRTIssuance: BigInt!
  "The issuance rate of GRT per block after GIP-0037. To get annual rate do (networkGRTIssuancePerBlock * blocksPerYear)"
  networkGRTIssuancePerBlock: BigInt!
  "Address of the availability oracle"
  subgraphAvailabilityOracle: Bytes!

  # Curation global parameters
  "Default reserve ratio for all subgraphs. In parts per million"
  defaultReserveRatio: Int!
  "Minimum amount of tokens needed to start curating"
  minimumCurationDeposit: BigInt!
  "The fee charged when a curator withdraws signal. In parts per million"
  curationTaxPercentage: Int!
  "Percentage of the GNS migration tax payed by the subgraph owner"
  ownerTaxPercentage: Int!

  # Graph Token global variables
  "Graph Token supply"
  totalSupply: BigInt!

  # TODO - implement these with uniswap
  "NOT IMPLEMENTED - Price of one GRT in USD"
  GRTinUSD: BigDecimal!
  "NOT IMPLEMENTED - Price of one GRT in ETH"
  GRTinETH: BigDecimal

  # Graph Token mint burn totals
  "Total amount of GRT minted"
  totalGRTMinted: BigInt!
  "Total amount of GRT burned"
  totalGRTBurned: BigInt!

  # Epoch manager global variables
  "Epoch Length in blocks"
  epochLength: Int!
  "Epoch that was last run"
  lastRunEpoch: Int!
  "Epoch when epoch length was last updated"
  lastLengthUpdateEpoch: Int!
  "Block when epoch length was last updated"
  lastLengthUpdateBlock: Int!
  "Current epoch the protocol is in"
  currentEpoch: Int!

  # Count aggregate values. Note, deprecated subgraphs or inactive users not removed from counts
  "Total indexers"
  indexerCount: Int!
  "Number of indexers that currently have some stake in the protocol"
  stakedIndexersCount: Int!
  "Total amount of delegators historically"
  delegatorCount: Int!
  "Total active delegators. Those that still have at least one active delegation."
  activeDelegatorCount: Int!
  "Total amount of delegations historically"
  delegationCount: Int!
  "Total active delegations. Those delegations that still have GRT staked towards an indexer"
  activeDelegationCount: Int!
  "Total amount of curators historically"
  curatorCount: Int!
  "Total amount of curators historically"
  activeCuratorCount: Int!
  "Total amount of Subgraph entities"
  subgraphCount: Int!
  "Amount of active Subgraph entities"
  activeSubgraphCount: Int!
  "Total amount of SubgraphDeployment entities"
  subgraphDeploymentCount: Int!
  "Total epochs"
  epochCount: Int!
  "Total amount of allocations opened"
  allocationCount: Int!
  "Total amount of allocations currently active"
  activeAllocationCount: Int!

  # Dispute Manager global variables
  "Dispute arbitrator"
  arbitrator: Bytes!
  "Penalty to Indexer on successful disputes for query disputes. In parts per million"
  querySlashingPercentage: Int!
  "Penalty to Indexer on successful disputes for indexing disputes. In parts per million"
  indexingSlashingPercentage: Int!
  "[DEPRECATED] Penalty to Indexer on successful disputes for indexing disputes. In parts per million"
  slashingPercentage: Int!
  "Minimum deposit to create a dispute"
  minimumDisputeDeposit: BigInt!
  "Reward to Fisherman on successful disputes. In parts per million"
  fishermanRewardPercentage: Int!

  # Bridge totals (Only available on L1 networks)
  "Total amount of GRT deposited to the L1 gateway. Note that the actual amount claimed in L2 might be lower due to tickets not redeemed."
  totalGRTDeposited: BigInt!
  "Total amount of GRT withdrawn from the L2 gateway and claimed in L1."
  totalGRTWithdrawnConfirmed: BigInt!
  "Total amount of GRT minted by L1 bridge"
  totalGRTMintedFromL2: BigInt!

  # Bridge totals (Only available on L2 networks)
  "Total amount of GRT deposited to the L1 gateway and redeemed in L2."
  totalGRTDepositedConfirmed: BigInt!
  "Total amount of GRT withdrawn from the L2 gateway. Note that the actual amount claimed in L1 might be lower due to outbound transactions not finalized."
  totalGRTWithdrawn: BigInt!
  "Block number for L1. Only implemented for L2 deployments to properly reflect the L1 block used for timings"
  currentL1BlockNumber: BigInt
}

"""
An account within the graph network. Contains metadata and all relevant data for this accounts
delegating, curating, and indexing.
"""
type GraphAccount @entity {
  "Graph account ID"
  id: ID!
  "All names this graph account has claimed from all name systems"
  names: [GraphAccountName!]! @derivedFrom(field: "graphAccount")
  "Default name the graph account has chosen"
  defaultName: GraphAccountName # Can optimize in future by checking ENS & others to make sure they still own the name
  "Time the account was created"
  createdAt: Int!
  "Default display name is the current default name. Used for filtered queries in the explorer"
  defaultDisplayName: String

  # IPFS Meta.
  metadata: GraphAccountMeta

  # Operator info
  "Operator of other Graph Accounts"
  operatorOf: [GraphAccount!]! @derivedFrom(field: "operators")
  "Operators of this Graph Accounts"
  operators: [GraphAccount!]!

  # GRT info
  "Graph token balance"
  balance: BigInt!
  "Balance received due to failed signal transfer from L1"
  balanceReceivedFromL1Signalling: BigInt!
  "Balance received due to failed delegation transfer from L1"
  balanceReceivedFromL1Delegation: BigInt!
  "Amount this account has approved staking to transfer their GRT"
  curationApproval: BigInt!
  "Amount this account has approved curation to transfer their GRT"
  stakingApproval: BigInt!
  "Amount this account has approved the GNS to transfer their GRT"
  gnsApproval: BigInt!

  # Subgraphs
  "Subgraphs the graph account owns"
  subgraphs: [Subgraph!]! @derivedFrom(field: "owner")
  "Time that this graph account became a developer"
  developerCreatedAt: Int
  "NOT IMPLEMENTED - Total query fees the subgraphs created by this account have accumulated in GRT"
  subgraphQueryFees: BigInt! # TODO - This is very hard to calculate, due to the many to one relationship between Subgraphs and SubgraphDeployments
  # Disputes
  "Disputes this graph account has created"
  createdDisputes: [Dispute!]! @derivedFrom(field: "fisherman")
  "Disputes against this graph account"
  disputesAgainst: [Dispute!]! @derivedFrom(field: "indexer")

  # Staking and Curating and Delegating
  "Curator fields for this GraphAccount. Null if never curated"
  curator: Curator
  "Indexer fields for this GraphAccount. Null if never indexed"
  indexer: Indexer
  "Delegator fields for this GraphAccount. Null if never delegated"
  delegator: Delegator

  # Transactions / activity feed
  "Name signal transactions created by this GraphAccount"
  nameSignalTransactions: [NameSignalTransaction!]! @derivedFrom(field: "signer")
  bridgeWithdrawalTransactions: [BridgeWithdrawalTransaction!]! @derivedFrom(field: "signer")
  bridgeDepositTransactions: [BridgeDepositTransaction!]! @derivedFrom(field: "signer")

  # Token Lock Wallets that this account is associated with
  tokenLockWallets: [TokenLockWallet!]!
}

type GraphAccountMeta @entity(immutable:true) {
  "IPFS hash with account metadata details"
  id: ID!
  "Account that reference this metadata file. For compatibility purposes. For the full list use graphAccounts"
  graphAccount: GraphAccount @derivedFrom(field:"metadata")
  "Accounts that reference this metadata file"
  graphAccounts: [GraphAccount!]! @derivedFrom(field:"metadata")
  "True if it is an organization. False if it is an individual"
  isOrganization: Boolean
  "Main repository of code for the graph account"
  codeRepository: String
  "Description of the graph account"
  description: String
  "Image URL"
  image: String
  "Website URL"
  website: String
  "Display name. Not unique"
  displayName: String
}

"""
A name chosen by a Graph Account from a Name System such as ENS. This allows Graph Accounts to be
recognized by name, rather than just an Ethereum address
"""
type GraphAccountName @entity {
  "Name system concatenated with the unique ID of the name system"
  id: ID!
  "Name system for this name"
  nameSystem: NameSystem!
  "Name from the system"
  name: String!
  "The graph account that owned the name when it was linked in the graph network"
  graphAccount: GraphAccount # May not match if the graph account proceeded to transfer away their name on that system
}

enum NameSystem {
  ENS
}

"""
The Subgraph entity represents a permanent, unique endpoint. This unique endpoint can resolve to
many different SubgraphVersions over it's lifetime. The Subgraph can also have a name attributed
to it. The owner of the Subgraph can only use a name once, thus making the owner account and the
name chosen a unique combination. When a Curator singals on a Subgraph, they receive "Name Signal".
"Name Signal" resolves into the underlying "Signal" of the SubgraphDeployment. The metadata of the
subgraph is stored on IPFS.
"""
type Subgraph @entity {
  "Subgraph ID - which is derived from the Organization/Individual graph accountID"
  id: ID!
  "Graph account that owns this subgraph"
  owner: GraphAccount!
  "Current version. Null if the subgraph is deprecated"
  currentVersion: SubgraphVersion
  "[DEPRECATED] Past versions. Has the same data as 'versions' but keeps the old naming for backwards compatibility"
  pastVersions: [SubgraphVersion!]! @derivedFrom(field: "subgraph")
  "List of all the subgraph versions included the current one"
  versions: [SubgraphVersion!]! @derivedFrom(field: "subgraph")
  "Version counter"
  versionCount: BigInt!
  "Creation timestamp"
  createdAt: Int!
  "Updated timestamp"
  updatedAt: Int!
  "Whether the subgraph is active or deprecated"
  active: Boolean!
  "Whether the subgraph has been claimed/migrated. Can only be false for subgraphs created with V1 contracts that have not been claimed/migrated"
  migrated: Boolean!
  "Whether the subgraph has been transferred from L1 to L2. Subgraphs published on L2 will have this as false unless they were published through a transfer"
  startedTransferToL2: Boolean!
  "Timestamp for the L1 -> L2 Transfer. Null if the transfer hasn't started yet"
  startedTransferToL2At: BigInt
  "Block number for the L1 -> L2 Transfer. Null if the transfer hasn't started yet"
  startedTransferToL2AtBlockNumber: BigInt
  "Transaction hash for the L1 -> L2 Transfer. Null if the transfer hasn't started yet"
  startedTransferToL2AtTx: String
  "Whether the subgraph has been fully transferred from L1 to L2. Subgraphs published on L2 will have this as false unless they were published through a transfer"
  transferredToL2: Boolean!
  "Timestamp for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2At: BigInt
  "Block number for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2AtBlockNumber: BigInt
  "Transaction hash for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2AtTx: String
  "Amount of GRT transferred to L2"
  signalledTokensSentToL2: BigInt!
  "Amount of GRT received on L2"
  signalledTokensReceivedOnL2: BigInt!
  "ID of the subgraph on L2. Null if it's not transferred"
  idOnL2: String
  "ID of the subgraph on L1. Null if it's not transferred"
  idOnL1: String
  "The actual ID of the subgraph on the contracts subgraph NFT implementation. BigInt represented as a String. It's only actually valid once the subgraph is migrated (migrated == true)"
  nftID: String
  "ID of the subgraph that was used on the old version of this The Graph Network Subgraph. Null for Subgraphs created with the new GNS implementation or for version 1 entities (since they use the old id)"
  oldID: String
  "Address used to create the ID. Only available for Subgraphs created pre-migration"
  creatorAddress: Bytes
  "Subgraph number used to create the ID. Only available for Subgraphs created pre-migration"
  subgraphNumber: BigInt
  "Auxiliary field to denote whether the subgraph is handling the initialization order on V2 events. Doesn't matter for V1 events."
  initializing: Boolean!
  "Version of the entity. Subgraph entities are changing the way their ID is generated when the new GNS v2 rolls out so we need to differnetiate them"
  entityVersion: Int!
  "[DEPRECATED] Used for duplicate entities to enable old IDs from before the subgraph NFT update"
  linkedEntity: Subgraph

  # Name curation data for bonding curve
  # Note that the Subgraphs V signal is actually stored in a Signal entity, which
  # considers the GNS as a Curator
  "CUMULATIVE signaled tokens on this subgraph all time"
  signalledTokens: BigInt!
  "CUMULATIVE unsignalled tokens on this subgraph all time"
  unsignalledTokens: BigInt!
  "CURRENT amount of tokens signalled on this subgraph latest version. Mirrors the total amount signalled towards the current deployment."
  currentSignalledTokens: BigInt!
  "The CURRENT name signal amount for this subgraph"
  nameSignalAmount: BigInt!
  "Current amount of version signal managed by the name pool"
  signalAmount: BigInt!
  "Reserve ratio of the name curation curve. In parts per million"
  reserveRatio: Int!
  "Tokens that can be withdrawn once the Subgraph is deprecated"
  withdrawableTokens: BigInt!
  "Tokens the curators have withdrawn from the deprecated Subgraph"
  withdrawnTokens: BigInt!
  "Curators of this subgraph deployment"
  nameSignals: [NameSignal!]! @derivedFrom(field: "subgraph")
  "Total amount of NameSignal entities"
  nameSignalCount: Int!

  # Meta from IPFS linked in GNS
  "Subgraph metadata"
  metadataHash: Bytes
  "Subgraph metadata ipfs hash and entity"
  metadata: SubgraphMeta

  # Auxiliary fields
  currentVersionRelationEntity: CurrentSubgraphDeploymentRelation
}

type SubgraphMeta @entity(immutable:true) {
  "Subgraph metadata ipfs hash"
  id: ID!
  "Subgraph that reference this metadata. For compatibility purposes. For the full list use subgraphs"
  subgraph: Subgraph @derivedFrom(field:"metadata")
  "Subgraphs that reference this metadata"
  subgraphs: [Subgraph!]! @derivedFrom(field:"metadata")
  "Short description of the subgraph"
  description: String
  "Image in string format"
  image: String
  "NFT Image representation"
  nftImage: String
  "Location of the code for this project"
  codeRepository: String
  "Projects website"
  website: String
  "Display name"
  displayName: String
  "Categories that the subgraph belongs to."
  categories: [String!]
}

type CurrentSubgraphDeploymentRelation @entity {
  "Auxiliary entity used to batch update Subgraph entities when signalling on the deployment changes. ID replicates the deployment ID and adds a counter, to make it easy to reproduce."
  id: ID!

  subgraph: Subgraph!

  deployment: SubgraphDeployment!

  "Indicates whether this relation is active. This means that the deployment is still the current deployment for the named Subgraph"
  active: Boolean!
}


"""
The SubgraphVersion entity represents a version of the Subgraph. A new SubgraphVersion is created
whenever there is an update to the Subgraph triggered by the owner. The new SubgraphVersion can
then point to a new SubgraphDeployment, thus allowing the Subgraph to resolve to a different
deployment, while keeping the same endpoint. The metadata and label are stored on IPFS. The label
is for the developer to provide a semantic version. This is different from the version, which is
just a counter than increases each time a new SubgraphVersion is created for a Subgraph.
"""
type SubgraphVersion @entity {
  "Concatenation of subgraph, subgraph deployment, and version ID"
  id: ID!
  "Subgraph of this version"
  subgraph: Subgraph!
  "Subgraph deployment of this version"
  subgraphDeployment: SubgraphDeployment!
  "Version number"
  version: Int!
  "Creation timestamp"
  createdAt: Int!

  metadataHash: Bytes
  # Meta from IPFS linked in GNS
  metadata: SubgraphVersionMeta

  entityVersion: Int!
  "[DEPRECATED] Used for duplicate entities to enable old IDs from before the subgraph NFT update"
  linkedEntity: SubgraphVersion
}

type SubgraphVersionMeta @entity(immutable:true) {
  "Subgraph version metadata ipfs hash"
  id: ID!
  "SubgraphVersion entity that references this metadata. For compatibility purposes. For the full list use subgraphVersions"
  subgraphVersion: SubgraphVersion @derivedFrom(field:"metadata")
  "SubgraphVersion entities that reference this metadata"
  subgraphVersions: [SubgraphVersion!]! @derivedFrom(field:"metadata")
  "Short description of the version"
  description: String
  "Semantic versioning label"
  label: String
}

"""
The SubgraphDeployment is represented by the immutable subgraph code that is uploaded, and posted
to IPFS. A SubgraphDeployment has a manifest which gives the instructions to the Graph Network on
what to index. The entity stores relevant data for the SubgraphDeployment on how much it is being
staked on and signaled on in the contracts, as well as how it is performing in query fees. It is
related to a SubgraphVersion.
"""
type SubgraphDeployment @entity {
  "Subgraph Deployment ID. The IPFS hash with Qm removed to fit into 32 bytes"
  id: ID!
  "IPFS hash of the subgraph manifest"
  ipfsHash: String!
  "The versions this subgraph deployment relates to"
  versions: [SubgraphVersion!]! @derivedFrom(field: "subgraphDeployment")
  "Creation timestamp"
  createdAt: Int!
  "The block at which this deployment was denied for rewards. Null if not denied"
  deniedAt: Int!
  "[DEPRECATED] The original Subgraph that was deployed through GNS. Can be null if never created through GNS. Used for filtering in the Explorer. Always null now"
  originalName: String

  # From Staking
  "CURRENT total stake of all indexers on this Subgraph Deployment"
  stakedTokens: BigInt!
  "Allocations created by indexers for this Subgraph"
  indexerAllocations: [Allocation!]! @derivedFrom(field: "subgraphDeployment")
  "Total rewards accrued all time by this Subgraph Deployment. Includes delegator and indexer rewards"
  indexingRewardAmount: BigInt!
  "Total rewards accrued all time by indexers"
  indexingIndexerRewardAmount: BigInt!
  "Total rewards accrued all time by delegators"
  indexingDelegatorRewardAmount: BigInt!
  "Total query fees earned by this Subgraph Deployment, without curator query fees"
  queryFeesAmount: BigInt!
  "Total query fee rebates earned from the protocol, through the rebates formula. Does not include delegation fees"
  queryFeeRebates: BigInt!
  "Total curator rewards from fees"
  curatorFeeRewards: BigInt!
  # TODO - We can add a field here for delegation fees earned when calling claim()

  # Subgraph deployment curation bonding curve
  "CURRENT signalled tokens in the bonding curve"
  signalledTokens: BigInt!
  "NOT IMPLEMENTED - CURRENT signalled tokens in the bonding curve"
  unsignalledTokens: BigInt! # Will be used for rewards
  "CURRENT curation signal for this subgraph deployment"
  signalAmount: BigInt!
  "signalledTokens / signalAmount"
  pricePerShare: BigDecimal!

  "Curators of this subgraph deployment"
  curatorSignals: [Signal!]! @derivedFrom(field: "subgraphDeployment")
  "Bonding curve reserve ratio. In parts per million"
  reserveRatio: Int!

  # From Subgraph Manifest
  # dataSources: [DataSource!]
  "Entity that represents the manifest of the deployment. Filled by File Data Sources"
  manifest: SubgraphDeploymentManifest

  # Counters for currentSignalledTokens tracking on Subgraph
  "Total amount of Subgraph entities that used this deployment at some point. subgraphCount >= activeSubgraphCount + deprecatedSubgraphCount"
  subgraphCount: Int!
  "Amount of active Subgraph entities that are currently using this deployment. Deprecated subgraph entities are not counted"
  activeSubgraphCount: Int!
  "Amount of Subgraph entities that were currently using this deployment when they got deprecated"
  deprecatedSubgraphCount: Int!

  "Whether the deployment has been transferred from L1 to L2. Subgraphs published on L2 will have this as false unless they were published through a transfer"
  transferredToL2: Boolean!
  "Timestamp for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2At: BigInt
  "Block number for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2AtBlockNumber: BigInt
  "Transaction hash for the L1 -> L2 Transfer. Null if it's not fully transferred or if it's an L1 deployment"
  transferredToL2AtTx: String
  "Amount of GRT transferred to L2"
  signalledTokensSentToL2: BigInt!
  "Amount of GRT received on L2"
  signalledTokensReceivedOnL2: BigInt!
}

type SubgraphDeploymentSchema @entity(immutable:true) {
  "IPFS Hash"
  id: ID!
  "Link to a SubgraphDeploymentManifest entity that references this schema. For backwards compatibility purposes only, for the full list of manifests use manifests"
  manifest: SubgraphDeploymentManifest @derivedFrom(field:"schema")
  "Links to SubgraphDeploymentManifest entities that reference this schema"
  manifests: [SubgraphDeploymentManifest!]! @derivedFrom(field:"schema")
  "Contents of the Schema file"
  schema: String
}

type SubgraphDeploymentManifest @entity(immutable:true) {
  "IPFS Hash"
  id: ID!
  "Link to SubgraphDeployment entity"
  deployment: SubgraphDeployment @derivedFrom(field:"manifest")
  "Schema entity"
  schema: SubgraphDeploymentSchema
  "Schema ipfs hash"
  schemaIpfsHash: String
  "Contents of the Manifest file"
  manifest: String
  "Network where the contracts that the subgraph indexes are located"
  network: String
  "Whether the subgraph is a SpS/SbS. Null if we can't parse it"
  poweredBySubstreams: Boolean
  "Start block for the deployment. It's the lowest startBlock found (0 if some data source doesn't contain a start block)"
  startBlock: BigInt
}

# TODO - add when we have the ability to parse data sources
# """Data source obtained from the subgraph manifest"""
# type DataSource @entity {
#   "Unique identifier of the data source. Such as contract address"
#   id: ID!
#   "Data source name in the manifest"
#   name: String!
#   "Networks that the subgraph deployment is indexing"
#   networks: [String!]!
#   "Contract"
#   contract: Contract!
#   "ABI of the contract"
#   abi: String!
# }

# type Contract @entity {
#   "Address of the contract"
#   id: ID!
#   "Contract name"
#   name: String
# }

"""
Meta for the Indexer along with parameters and staking data
"""
type Indexer @entity {
  "Eth address of Indexer"
  id: ID!
  "Time this indexer was created"
  createdAt: Int!
  "Graph account of this indexer"
  account: GraphAccount!
  "Service registry URL for the indexer"
  url: String
  "Geohash of the indexer. Shows where their indexer is located in the world"
  geoHash: String
  "Default display name is the current default name. Used for filtered queries"
  defaultDisplayName: String

  # Staking data
  "CURRENT tokens staked in the protocol. Decreases on withdraw, not on lock"
  stakedTokens: BigInt!
  "CURRENT  tokens allocated on all subgraphs"
  allocatedTokens: BigInt!
  "NOT IMPLEMENTED - Tokens that have been unstaked and withdrawn"
  unstakedTokens: BigInt! # will be used for return % calcs
  "CURRENT tokens locked"
  lockedTokens: BigInt!
  "The block when the Indexers tokens unlock"
  tokensLockedUntil: Int!
  "Active allocations of stake for this Indexer"
  allocations: [Allocation!]! @derivedFrom(field: "activeForIndexer")
  "All allocations of stake for this Indexer (i.e. closed and active)"
  totalAllocations: [Allocation!]! @derivedFrom(field: "indexer")
  "Number of active allocations of stake for this Indexer"
  allocationCount: Int!
  "All allocations for this Indexer (i.e. closed and active)"
  totalAllocationCount: BigInt!
  "Total query fees collected. Includes the portion given to delegators"
  queryFeesCollected: BigInt!
  "Query fee rebate amount claimed from the protocol through rebates mechanism. Does not include portion given to delegators"
  queryFeeRebates: BigInt!
  "Total indexing rewards earned by this indexer from inflation. Including delegation rewards"
  rewardsEarned: BigInt!
  "The total amount of indexing rewards the indexer kept"
  indexerIndexingRewards: BigInt!
  "The total amount of indexing rewards given to delegators"
  delegatorIndexingRewards: BigInt!
  "Percentage of indexers' own rewards received in relation to its own stake. 1 (100%) means that the indexer is receiving the exact amount that is generated by his own stake"
  indexerRewardsOwnGenerationRatio: BigDecimal!
  "Whether the indexer has been transferred from L1 to L2 partially or fully"
  transferredToL2: Boolean!
  "Timestamp for the FIRST L1 -> L2 Transfer"
  firstTransferredToL2At: BigInt
  "Block number for the FIRST L1 -> L2 Transfer"
  firstTransferredToL2AtBlockNumber: BigInt
  "Transaction hash for the FIRST L1 -> L2 Transfer"
  firstTransferredToL2AtTx: String
  "Timestamp for the latest L1 -> L2 Transfer"
  lastTransferredToL2At: BigInt
  "Block number for the latest L1 -> L2 Transfer"
  lastTransferredToL2AtBlockNumber: BigInt
  "Transaction hash for the latest L1 -> L2 Transfer"
  lastTransferredToL2AtTx: String
  "Amount of GRT transferred to L2. Only visible from L1, as there's no events for it on L2"
  stakedTokensTransferredToL2: BigInt!
  "ID of the indexer on L2. Null if it's not transferred"
  idOnL2: String
  "ID of the indexer on L1. Null if it's not transferred"
  idOnL1: String

  # Capacity Data
  "Amount of delegated tokens that can be eligible for rewards"
  delegatedCapacity: BigInt!
  "Total token capacity = delegatedCapacity + stakedTokens"
  tokenCapacity: BigInt!
  "Stake available to earn rewards. tokenCapacity - allocationTokens - lockedTokens"
  availableStake: BigInt!

  # Delegation Pool
  "Delegators to this Indexer"
  delegators: [DelegatedStake!]! @derivedFrom(field: "indexer")
  "CURRENT tokens delegated to the indexer"
  delegatedTokens: BigInt!
  "Ratio between the amount of the indexers own stake over the total usable stake."
  ownStakeRatio: BigDecimal!
  "Ratio between the amount of delegated stake over the total usable stake."
  delegatedStakeRatio: BigDecimal!
  "Total shares of the delegator pool"
  delegatorShares: BigInt!
  "Exchange rate of of tokens received for each share"
  delegationExchangeRate: BigDecimal!
  "The percent of indexing rewards generated by the total stake that the Indexer keeps for itself. In parts per million"
  indexingRewardCut: Int!
  "The percent of indexing rewards generated by the delegated stake that the Indexer keeps for itself"
  indexingRewardEffectiveCut: BigDecimal!
  "The percent of reward dilution delegators experience because of overdelegation. Overdelegated stake can't be used to generate rewards but still gets accounted while distributing the generated rewards. This causes dilution of the rewards for the rest of the pool."
  overDelegationDilution: BigDecimal!
  "The total amount of query fees given to delegators"
  delegatorQueryFees: BigInt!
  "The percent of query rebate rewards the Indexer keeps for itself. In parts per million"
  queryFeeCut: Int!
  "The percent of query rebate rewards generated by the delegated stake that the Indexer keeps for itself"
  queryFeeEffectiveCut: BigDecimal!
  "Amount of blocks a delegator chooses for the waiting period for changing their params"
  delegatorParameterCooldown: Int!
  "Block number for the last time the delegator updated their parameters"
  lastDelegationParameterUpdate: Int!
  "Count of how many times this indexer has been forced to close an allocation"
  forcedClosures: Int!

  # Metrics
  "NOT IMPLEMENTED - Total return this indexer has earned"
  totalReturn: BigDecimal!
  "NOT IMPLEMENTED - Annualized rate of return for the indexer"
  annualizedReturn: BigDecimal! # You must multiple by 100 to get percentage
  "NOT IMPLEMENTED - Staking efficiency of the indexer"
  stakingEfficiency: BigDecimal!
}

"""
A state channel Allocation representing a single Indexer-SubgraphDeployment stake
"""
type Allocation @entity {
  "Channel Address"
  id: ID!
  "Indexer of this allocation"
  indexer: Indexer!
  "Creator of the allocation - can be the operator or the indexer"
  creator: Bytes!
  "If the Allocation is active it shows the indexer. If closed, it is null"
  activeForIndexer: Indexer
  "Subgraph deployment that is being allocated to"
  subgraphDeployment: SubgraphDeployment!
  "Tokens allocation in this allocation"
  allocatedTokens: BigInt!
  "[DEPRECATED] Effective allocation that is realized upon closing"
  effectiveAllocation: BigInt!
  "Epoch this allocation was created"
  createdAtEpoch: Int!
  "Block at which this allocation was created"
  createdAtBlockHash: Bytes!
  "Block number at which this allocation was created"
  createdAtBlockNumber: Int!
  "Epoch this allocation was closed in"
  closedAtEpoch: Int
  "Block hash at which this allocation was closed"
  closedAtBlockHash: Bytes
  "Block number at which this allocation was closed"
  closedAtBlockNumber: Int
  "Fees this allocation collected from query fees upon closing. Excludes curator reward and protocol tax"
  queryFeesCollected: BigInt!
  "Query fee rebate amount claimed from the protocol through rebates mechanism. Does not include portion given to delegators"
  queryFeeRebates: BigInt!
  "Query fee rebates collected from the protocol. Can differ from queryFeeRebates if multiple vouchers per allocation are allowed."
  distributedRebates: BigInt!
  "Curator rewards deposited to the curating bonding curve"
  curatorRewards: BigInt!
  "Indexing rewards earned by this allocation. Includes delegator and indexer rewards"
  indexingRewards: BigInt!
  "Indexing rewards earned by this allocation by indexers"
  indexingIndexerRewards: BigInt!
  "Indexing rewards earned by this allocation by delegators"
  indexingDelegatorRewards: BigInt!
  "[DEPRECATED] Pool in which this allocation was closed"
  poolClosedIn: Pool
  "Fees paid out to delegators"
  delegationFees: BigInt!
  "Status of the allocation"
  status: AllocationStatus!
  "Timestamp this allocation was created at"
  createdAt: Int!
  "Timestamp this allocation was closed at"
  closedAt: Int
  "POI submitted with a closed allocation"
  poi: Bytes

  # Indexer cut settings at start and close
  indexingRewardCutAtStart: Int!
  indexingRewardEffectiveCutAtStart: BigDecimal!
  queryFeeCutAtStart: Int!
  queryFeeEffectiveCutAtStart: BigDecimal!

  indexingRewardCutAtClose: Int
  indexingRewardEffectiveCutAtClose: BigDecimal
  queryFeeCutAtClose: Int
  queryFeeEffectiveCutAtClose: BigDecimal

  # Metrics NOT IMPLEMENTED YET
  "NOT IMPLEMENTED - Return for this allocation"
  totalReturn: BigDecimal!
  "NOT IMPLEMENTED - Yearly annualzied return"
  annualizedReturn: BigDecimal!
}

enum AllocationStatus {
  Null # == indexer == address(0)
  Active # == not Null && tokens > 0 #
  Closed # == Active && closedAtEpoch != 0. Still can collect, while you are waiting to be finalized. a.k.a settling
  Finalized # == [DEPRECATED] Closing && closedAtEpoch + channelDisputeEpochs > now(). Note, the subgraph has no way to return this value. it is implied
  Claimed # == [DEPRECATED] not Null && tokens == 0 - i.e. finalized, and all tokens withdrawn
}

"""
[DEPRECATED] Global pool of query fees for closed state channels. Each Epoch has a single pool,
hence why they share the same IDs.
"""
type Pool @entity {
  "Epoch number of the pool"
  id: ID!
  "Total effective allocation tokens from all allocations closed in this epoch"
  allocation: BigInt!
  "Total query fees collected in this epoch"
  totalQueryFees: BigInt!
  "Total query fees claimed in this epoch. Can be smaller than totalFees because of rebates function "
  claimedFees: BigInt!
  "Total rewards from query fees deposited to all curator bonding curves during the epoch"
  curatorRewards: BigInt!
  "Allocations that were closed during this epoch"
  closedAllocations: [Allocation!]! @derivedFrom(field: "poolClosedIn")
}

"""
Delegator with all their delegated stakes towards Indexers
"""
type Delegator @entity {
  "Delegator address"
  id: ID!
  "Graph account of the delegator"
  account: GraphAccount!
  "Stakes of this delegator"
  stakes: [DelegatedStake!]! @derivedFrom(field: "delegator")
  "CUMULATIVE staked tokens in DelegatorStakes of this Delegator"
  totalStakedTokens: BigInt!
  "CUMULATIVE unstaked tokens in DelegatorStakes of this Delegator"
  totalUnstakedTokens: BigInt!
  "Time created at"
  createdAt: Int!
  "Total realized rewards on all delegated stakes. Realized rewards are added when undelegating and realizing a profit"
  totalRealizedRewards: BigDecimal!

  "Total DelegatedStake entity count (Active and inactive)"
  stakesCount: Int!
  "Active DelegatedStake entity count. Active means it still has GRT delegated"
  activeStakesCount: Int!

  "Default display name is the current default name. Used for filtered queries"
  defaultDisplayName: String
}

"""
Delegator stake for a single Indexer
"""
type DelegatedStake @entity {
  "Concatenation of Delegator address and Indexer address"
  id: ID!
  "Index the stake is delegated to"
  indexer: Indexer!
  "Delegator"
  delegator: Delegator!
  "CUMULATIVE tokens delegated"
  stakedTokens: BigInt!
  "CUMULATIVE tokens undelegated"
  unstakedTokens: BigInt!
  "CURRENT tokens locked"
  lockedTokens: BigInt!
  "Epoch the locked tokens get unlocked"
  lockedUntil: Int!
  "Shares owned in the delegator pool. Used to calculate total amount delegated"
  shareAmount: BigInt!
  "The rate this delegator paid for their shares (calculated using average cost basis). Used for rewards calculations"
  personalExchangeRate: BigDecimal!
  "Realized rewards from undelegating and realizing a reward"
  realizedRewards: BigDecimal!
  "Time this delegator first delegated to an indexer"
  createdAt: Int!
  "Last time this delegator delegated towards this indexer"
  lastDelegatedAt: Int
  "Last time this delegator undelegated from this indexer"
  lastUndelegatedAt: Int
  "Whether the delegation has been transferred from L1 to L2"
  transferredToL2: Boolean!
  "Timestamp for the L1 -> L2 Transfer"
  transferredToL2At: BigInt
  "Block number for the L1 -> L2 Transfer"
  transferredToL2AtBlockNumber: BigInt
  "Transaction hash for the L1 -> L2 Transfer"
  transferredToL2AtTx: String
  "Amount of GRT transferred to L2. Only visible from L1, as there's no events for it on L2"
  stakedTokensTransferredToL2: BigInt!
  "ID of the delegation on L2. Null if it's not transferred"
  idOnL2: String
  "ID of the delegation on L1. Null if it's not transferred"
  idOnL1: String
}

"""
Curator with all Signals and metrics
"""
type Curator @entity {
  "Eth address of the Curator"
  id: ID!
  "Time this curator was created"
  createdAt: Int!
  "Graph account of this curator"
  account: GraphAccount!
  "CUMULATIVE tokens signalled on all the subgraphs"
  totalSignalledTokens: BigInt!
  "CUMULATIVE tokens unsignalled on all the subgraphs"
  totalUnsignalledTokens: BigInt!
  "Subgraphs the curator is curating"
  signals: [Signal!]! @derivedFrom(field: "curator")
  "Default display name is the current default name. Used for filtered queries"
  defaultDisplayName: String

  "CUMULATIVE tokens signalled on all names"
  totalNameSignalledTokens: BigInt!
  "CUMULATIVE tokens unsignalled on all names"
  totalNameUnsignalledTokens: BigInt!
  "CUMULATIVE withdrawn tokens from deprecated subgraphs"
  totalWithdrawnTokens: BigInt!
  "Subgraphs the curator is curating"
  nameSignals: [NameSignal!]! @derivedFrom(field: "curator")

  # Metrics NOTE - will be hard to calculate these with the two types of signal
  "NOT IMPLEMENTED - Summation of realized rewards from all Signals"
  realizedRewards: BigInt!
  "NOT IMPLEMENTED - Annualized rate of return on curator signal"
  annualizedReturn: BigDecimal!
  "NOT IMPLEMENTED - Total return of the curator"
  totalReturn: BigDecimal!
  "NOT IMPLEMENTED - Signaling efficiency of the curator"
  signalingEfficiency: BigDecimal!

  "CURRENT summed name signal for all bonding curves"
  totalNameSignal: BigDecimal!
  "Total curator cost basis of all shares of name pools purchased on all bonding curves"
  totalNameSignalAverageCostBasis: BigDecimal!
  "totalNameSignalAverageCostBasis / totalNameSignal"
  totalAverageCostBasisPerNameSignal: BigDecimal!
  "CURRENT summed signal for all bonding curves"
  totalSignal: BigDecimal!
  "Total curator cost basis of all version signal shares purchased on all bonding curves. Includes those purchased through GNS name pools"
  totalSignalAverageCostBasis: BigDecimal!
  "totalSignalAverageCostBasis / totalSignal"
  totalAverageCostBasisPerSignal: BigDecimal!

  # Curation counters
  "Total amount of signals created by this user"
  signalCount: Int!
  "Amount of active signals for this user"
  activeSignalCount: Int!
  "Total amount of name signals created by this user"
  nameSignalCount: Int!
  "Amount of active name signals for this user"
  activeNameSignalCount: Int!
  "Total amount of name signals and signals created by this user. signalCount + nameSignalCount"
  combinedSignalCount: Int!
  "Amount of active name signals and signals for this user. signalCount + nameSignalCount"
  activeCombinedSignalCount: Int!
}

"""
Curator Signal for a single SubgraphDeployment
"""
type Signal @entity {
  "Eth address + subgraph deployment ID"
  id: ID!
  "Eth address of the curator"
  curator: Curator!
  "Subgraph being signalled"
  subgraphDeployment: SubgraphDeployment!
  "CUMULATIVE number of tokens the curator has signalled"
  signalledTokens: BigInt!
  "CUMULATIVE number of tokens the curator has unsignalled"
  unsignalledTokens: BigInt!
  "Signal that the curator has from signaling their GRT"
  signal: BigInt!
  "Curator average cost basis for this signal on this subgraph"
  averageCostBasis: BigDecimal!
  "averageCostBasis / signal"
  averageCostBasisPerSignal: BigDecimal!

  # Metrics
  "Block for which the curator last entered or exited the curve"
  lastSignalChange: Int!
  # These are summed up and added whenever curator enters or exists the curve. Then we must calculate
  # unrealized gains for their current balance, based on the time since the last exit/entry of the curve
  "Summation of realized rewards from before the last time the curator entered the curation curve"
  realizedRewards: BigInt!

  "Timetamp when this entity was created"
  createdAt: Int!
  "Timetamp when this entity was last updated"
  lastUpdatedAt: Int!
  "Block number where this entity was created"
  createdAtBlock: Int!
  "Block number where this entity was last updated"
  lastUpdatedAtBlock: Int!
}

"""
Curator Name Signal for a single Subgraph
"""
type NameSignal @entity {
  "Eth address + subgraph ID"
  id: ID!
  "Eth address of the curator"
  curator: Curator!
  "Subgraph being signalled"
  subgraph: Subgraph!
  "CUMULATIVE number of tokens the curator has signalled"
  signalledTokens: BigInt!
  "CUMULATIVE number of tokens the curator has unsignalled"
  unsignalledTokens: BigInt!
  "Tokens the curator has withdrawn from a deprecated name curve"
  withdrawnTokens: BigInt!
  "Shares of the name pool (GNS) that the curator has from signaling their GRT"
  nameSignal: BigInt!
  "Actual signal shares that the name pool minted with the GRT provided by the curator"
  signal: BigDecimal!
  "Amount of GRT transferred to L2"
  signalledTokensSentToL2: BigInt!
  "Amount of GRT received on L2"
  signalledTokensReceivedOnL2: BigInt!
  "Whether the name signal has been transferred from L1 to L2. Only applies to NameSignals that have been transferred, native L2 NameSignal entities will return false"
  transferredToL2: Boolean!
  "Timestamp for the L1 -> L2 Transfer."
  transferredToL2At: BigInt
  "Block number for the L1 -> L2 Transfer."
  transferredToL2AtBlockNumber: BigInt
  "Transaction hash for the L1 -> L2 Transfer."
  transferredToL2AtTx: String
  "ID of the NameSignal entity on L2. Null if it's not transferred"
  idOnL2: String
  "ID of the NameSignal entity on L1. Null if it's not transferred"
  idOnL1: String

  # Metrics
  "Block for which the curator last entered or exited the curve"
  lastNameSignalChange: Int!
  # These are summed up and added whenever curator enters or exists the curve. Then we must calculate
  # unrealized gains for their current balance, based on the time since the last exit/entry of the curve
  "Summation of realized rewards from before the last time the curator entered the curation curve"
  realizedRewards: BigInt!

  "[DEPRECATED] Curator average cost basis for this name signal on this subgraph. New field for further versions will be nameSignalAverageCostBasis"
  averageCostBasis: BigDecimal! # note this is ONLY name signal. This is okay for the protocol for now
  "[DEPRECATED] nameSignalAverageCostBasis / nameSignal. New field for further versions will be nameSignalAverageCostBasisPerSignal"
  averageCostBasisPerSignal: BigDecimal!

  "Curator average cost basis for this name signal on this subgraph"
  nameSignalAverageCostBasis: BigDecimal! # note this is ONLY name signal. This is okay for the protocol for now
  "nameSignalAverageCostBasis / nameSignal"
  nameSignalAverageCostBasisPerSignal: BigDecimal!

  "Curator average cost basis for the version signal on this subgraph name pool"
  signalAverageCostBasis: BigDecimal!
  "signalAverageCostBasis / signal"
  signalAverageCostBasisPerSignal: BigDecimal!

  entityVersion: Int!
  "[DEPRECATED] Used for duplicate entities to enable old IDs from before the subgraph NFT update"
  linkedEntity: NameSignal
}

"""
Auxiliary entity to be able to batch update NameSignal entities
"""
type NameSignalSubgraphRelation @entity {
  "Subgraph ID + index"
  id: ID!

  nameSignal: NameSignal!

  subgraph: Subgraph!
}

"""
Dispute of a query. Includes single query, conflicting attestation, and indexing disputes
"""
type Dispute @entity {
  "Dispute ID"
  id: ID!
  "Subgraph deployment being disputed"
  subgraphDeployment: SubgraphDeployment!
  "Fisherman address"
  fisherman: GraphAccount!
  "Fisherman deposit"
  deposit: BigInt!

  "Time dispute was created"
  createdAt: Int!
  "Time dispute was closed at"
  closedAt: Int!
  "Status of the dispute. Accepted means the Indexer was slashed"
  status: DisputeStatus!
  "Total amount of tokens slashed on the dispute"
  tokensSlashed: BigDecimal!
  "Amount of the slashed tokens that was burned"
  tokensBurned: BigDecimal!
  "Amount of the slashed tokens that was payed as reward to the fisherman"
  tokensRewarded: BigInt!

  # Type specific data
  "Type of dispute"
  type: DisputeType!
  "Indexer disputed"
  indexer: GraphAccount!
  "Attestation. Only for single query and conflicting attestations"
  attestation: Attestation
  "Linked dispute of other Indexer. Only for conflicting attestation"
  linkedDispute: Dispute
  "Allocation ID. Only for Indexing Disputes"
  allocation: Allocation
}

"""
Attestation of a dispute
"""
type Attestation @entity {
  "Concatenation of the requestCID and responseCID"
  id: ID!
  "Subgraph deployment being disputed"
  subgraphDeployment: SubgraphDeployment!
  "RequestCID"
  requestCID: String!
  "ResponseCID"
  responseCID: String!
  "NOT IMPLEMENTED - Gas used by the attested query"
  gasUsed: BigInt # Get from Allocation metadata when available
  "NOT IMPLEMENTED - Bytes of attested query"
  responseNumBytes: BigInt # Get from Allocation metadata when available
  "V of the indexers signature"
  v: Int!
  "R of the indexers signature"
  r: String!
  "S of the indexers signature"
  s: String!
}

enum DisputeType {
  SingleQuery
  Conflicting
  Indexing
}

enum DisputeStatus {
  Undecided
  Accepted
  Rejected
  Draw
}

"""
Epoch aggregate data for network statistics on signaling, rewards, and query fees
"""
type Epoch @entity {
  "Epoch number"
  id: ID!
  "Start block of the epoch"
  startBlock: Int!
  "End block of the epoch"
  endBlock: Int!
  "Signaled tokens during this epoch"
  signalledTokens: BigInt!
  "Stake deposited during this epoch"
  stakeDeposited: BigInt!
  "Total amount of query fees generated during this epoch (Includes everything)"
  totalQueryFees: BigInt!
  "Amount of query fees generated that were burnt by the 1% protocol tax during this epoch"
  taxedQueryFees: BigInt!
  "Amount of query fees generated for indexers during this epoch"
  queryFeesCollected: BigInt!
  "Amount of query fees generated that are going to curators during this epoch"
  curatorQueryFees: BigInt!
  "Rebate amount claimed from the protocol through rebates mechanism during this epoch"
  queryFeeRebates: BigInt!
  "Total indexing rewards earned in this epoch. Includes both delegator and indexer rewards"
  totalRewards: BigInt!
  "Total indexing rewards earned in this epoch by indexers"
  totalIndexerRewards: BigInt!
  "Total indexing rewards earned in this epoch by delegators"
  totalDelegatorRewards: BigInt!
}

"""
A generic transaction in The Graph Network
"""
interface Transaction {
  "Transaction hash concatenated with event log index"
  id: ID!
  "Block number for the transaction"
  blockNumber: Int!
  "Timestamp for the transaction"
  timestamp: Int!
  "Signer of the transaction"
  signer: GraphAccount!
  "Type of Graph Network transaction"
  type: TransactionType!
  # TODO - add epoch number,
}

"""
All relevant data for a Name Signal Transaction in The Graph Network
"""
type NameSignalTransaction implements Transaction @entity {
  id: ID!
  blockNumber: Int!
  timestamp: Int!
  signer: GraphAccount!
  type: TransactionType!
  "Amount of name signal updated"
  nameSignal: BigInt!
  "Amount of version signal updated"
  versionSignal: BigInt!
  "Tokens used"
  tokens: BigInt!
  "Subgraph where name signal was updated"
  subgraph: Subgraph!
}

"""
All relevant data for a Signal Transaction in The Graph Network
"""
type SignalTransaction implements Transaction @entity {
  id: ID!
  blockNumber: Int!
  timestamp: Int!
  signer: GraphAccount!
  type: TransactionType!
  "Amount of signal updated"
  signal: BigInt!
  "Tokens used"
  tokens: BigInt!
  "Subgraph where signal was updated"
  subgraphDeployment: SubgraphDeployment!
  "Withdrawal fees. On minting only"
  withdrawalFees: BigInt!
}

"""
All relevant data for a bridge withdrawal Transaction in The Graph Network
"""
type BridgeWithdrawalTransaction implements Transaction @entity {
  id: ID!
  blockNumber: Int!
  timestamp: Int!
  signer: GraphAccount!
  type: TransactionType!
  "txHash refers to the tx on the chain corresponding to this subgraph deployment"
  txHash: Bytes
  from: Bytes
  to: Bytes
  amount: BigInt
  l1Token: Bytes
  "transactionIndex is the unique value that allows matching an L2 transaction with its L1 counterpart"
  transactionIndex: BigInt
}

"""
All relevant data for a bridge deposit Transaction in The Graph Network
"""
type BridgeDepositTransaction implements Transaction @entity {
  id: ID!
  blockNumber: Int!
  timestamp: Int!
  signer: GraphAccount!
  type: TransactionType!
  "txHash refers to the tx on the chain corresponding to this subgraph deployment"
  txHash: Bytes!
  from: Bytes
  to: Bytes
  amount: BigInt
  l1Token: Bytes
  "retryableTicketId is the unique value that allows matching an L2 transaction with its L1 counterpart"
  retryableTicketId: String
  "Whether the deposit was initiated through Arbitrum's gateway router (Only available on L1 networks)"
  routed: Boolean
}

"""
All relevant data for arbitrum retryable tickets
"""
type RetryableTicket @entity {
  id: ID!
  "hash of the retryable ticket creation transaction"
  txHash: Bytes
  redeemAttempts: [RetryableTicketRedeemAttempt!]! @derivedFrom(field: "ticketId")
  "The amount of times the ticket has been scheduled for redeeming"
  redeemCount: Int
}

type RetryableTicketRedeemAttempt @entity {
  id: ID!
  ticketId: RetryableTicket!
  txHash: Bytes
  sequenceNumber: Int
}

enum TransactionType {
  Stake
  Unstake
  MintSignal
  BurnSignal
  MintNSignal
  BurnNSignal
  BridgeWithdrawal
  BridgeDeposit
}

"""
The Token manager data
"""
type TokenManager @entity {
  "Token manager address"
  id: ID!
  "Master copy address"
  masterCopy: Bytes!
  "Tokens stored in manger through deposit or withdraw"
  tokens: BigInt!
  "List of addresses that are allowed to pull funds"
  tokenDestinations: [Bytes!]
  "List of function call authorizations"
  authorizedFunctions: [AuthorizedFunction!] @derivedFrom(field: "manager")
  "Token lock count of contracts created"
  tokenLockCount: BigInt!
}

"""
Authorized functions for the Manager
"""
type AuthorizedFunction @entity {
  "Function signature (string)"
  id: ID!
  "The contract address that is authorized to have this function called on itself"
  target: Bytes!
  "Hash of the function signature"
  sigHash: Bytes!
  "Token lock Manager"
  manager: TokenManager!
}
"""
Token Lock Wallets which hold locked GRT
"""
type TokenLockWallet @entity {
  "The address of the token lock wallet"
  id: ID!
  "The Manager address"
  manager: Bytes!
  "The hash of the initializer"
  initHash: Bytes!
  "Address of the beneficiary of locked tokens"
  beneficiary: Bytes!
  "The token being used (GRT)"
  token: Bytes!
  "Amount of tokens to be managed by the lock contract"
  managedAmount: BigInt!
  "Start time of the release schedule"
  startTime: BigInt!
  "End time of the release schedule"
  endTime: BigInt!
  "Number of periods between start time and end time"
  periods: BigInt!
  "Time when the releases start"
  releaseStartTime: BigInt!
  "Time the cliff vests, 0 if no cliff"
  vestingCliffTime: BigInt!
  "Whether or not the contract is revocable"
  revocable: Revocability
  "True if the beneficiary has approved addresses that the manager has approved"
  tokenDestinationsApproved: Boolean!
  "The amount of tokens that have been resleased"
  tokensReleased: BigInt!
  "The amount of tokens that have been withdrawn"
  tokensWithdrawn: BigInt!
  "The amount of tokens that have been revoked"
  tokensRevoked: BigInt!
  "The block this wlalet was created"
  blockNumberCreated: BigInt!
  "The creation tx hash of the wallet"
  txHash: Bytes!
}

"""
TokenLockWallet Revocability Enum
"""
enum Revocability {
  NotSet
  Enabled
  Disabled
}

"""
Full test search for displayName and description on the Subgraph Entity
"""
type _Schema_
  @fulltext(
    name: "subgraphMetadataSearch"
    language: en
    algorithm: rank
    include: [{ entity: "SubgraphMeta", fields: [{ name: "displayName" }, { name: "description" }] }]
  )
  @fulltext(
    name: "curatorSearch"
    language: en
    algorithm: rank
    include: [{ entity: "Curator", fields: [{ name: "defaultDisplayName" }, { name: "id" }] }]
  )
  @fulltext(
    name: "delegatorSearch"
    language: en
    algorithm: rank
    include: [{ entity: "Delegator", fields: [{ name: "defaultDisplayName" }, { name: "id" }] }]
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

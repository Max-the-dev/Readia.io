

# FEATURES ROADMAP

## UI / UX Features:
  - Dark mode (light, dark, system)
  - Category statistics (total articles, avg popularity for each category)
  - Category-specific trending sections
    - Add trending indicators
  - Reading history and favorites for users
  - Make categories persist in drafts (Requires db schema/new routes)
  - x402 donation
    
### Enhanced Article Discovery (home page):
  - "Popular Articles" section on home page
    - Switch b/n "Popular Articles" and "Recently Published" feed
  - Author profiles
  - Author highlighting 

## API / Tech MARKETPLACE: 

  - code access (scraping) & API usage profits directly to publisher wallet via x402
    - Similar layout to article publishing & access 
  - 3rd party integrations to share direct link 
    - May need author profiles for this 



# DEV PLAN 

## x402/payment system
- Complete x402 payments production setup for mainnet

## Styling/cleanup
- logo/branding
- clean up / format code 
- resources & support misc.
   - Writer's toolkit 
   - x402 document w/ code examples and technical details 
   - X comm link on Help page
   - Security overview on Privacy page 
   - github link (make public) on resources page 
   - Later:
      - Support email integration (to support@domain.whatever)
      - help page form email integration
      - update documentation (readme, claude.md)

# Green Flags 
  - EIP-55 CheckSum implemented 
  - RainbowKit for wallet connections

# x402 Integration
  ## Flow Diagrams
        ┌──────────┐         ┌─────────────┐         ┌──────────────┐         ┌─────────────┐
        │  Reader  │         │  Frontend   │         │   Backend    │         │ Blockchain  │
        │ (Wallet) │         │             │         │              │         │ (Base L2)   │
        └────┬─────┘         └──────┬──────┘         └──────┬───────┘         └──────┬──────┘
            │                      │                       │                        │
            │ 1. Click Purchase    │                       │                        │
            ├─────────────────────>│                       │                        │
            │                      │                       │                        │
            │                      │ 2. POST /purchase     │                        │
            │                      │   (no X-PAYMENT)      │                        │
            │                      ├──────────────────────>│                        │
            │                      │                       │                        │
            │                      │ 3. 402 Requirements   │                        │
            │                      │<──────────────────────┤                        │
            │                      │                       │                        │
            │ 4. Sign Authorization│                       │                        │
            │   (ONE popup!)       │                       │                        │
            │<─────────────────────┤                       │                        │
            │                      │                       │                        │
            │ 5. Signature         │                       │                        │
            ├─────────────────────>│                       │                        │
            │                      │                       │                        │
            │                      │ 6. POST /purchase     │                        │
            │                      │   + X-PAYMENT header  │                        │
            │                      ├──────────────────────>│                        │
            │                      │                       │                        │
            │                      │                       │ 7. Verify with         │
            │                      │                       │    CDP facilitator     │
            │                      │                       │                        │
            │                      │                       │ 8. ✅ Valid!           │
            │                      │                       │                        │
            │                      │                       │ 9. Submit authorization│
            │                      │                       │    on-chain (platform  │
            │                      │                       │    wallet pays gas)    │
            │                      │                       ├───────────────────────>│
            │                      │                       │                        │
            │                      │                       │ 10. Transaction hash   │
            │                      │                       │<───────────────────────┤
            │                      │                       │                        │
            │                      │                       │ 11. Update DB with     │
            │                      │                       │     tx hash            │
            │                      │                       │                        │
            │                      │ 12. Success + receipt │                        │
            │                      │<──────────────────────┤                        │
            │                      │                       │                        │
            │ 13. Content unlocked │                       │                        │
            │<─────────────────────┤                       │                        │
  
  ### Purchase flow 
        ┌────────────────────────────────────────────────────┐
        │ Step 1: Verify Authorization                       │
        │ ✅ Valid signature? → Continue                     │
        │ ❌ Invalid? → Return 400 error                     │
        └────────────────────────────────────────────────────┘
                                ↓
        ┌────────────────────────────────────────────────────┐
        │ Step 2: Settle Payment (CDP transfers USDC)        │
        │ ✅ Settlement success? → Continue                  │
        │ ❌ Settlement failed? → Return 500 error           │
        └────────────────────────────────────────────────────┘
        * wait for settlement before granting access                         
                                ↓
        ┌────────────────────────────────────────────────────┐
        │ Step 3: Grant Access                               │
        │ ✅ Record payment in DB                            │
        │ ✅ Unlock content for user                         │
        │ ✅ Return success with transaction hash            │
        └────────────────────────────────────────────────────┘



  ## Key Files & Roles
  | File | Role | What it Does | 
  | frontend/src/pages/Article.tsx:118-156 | Payment Initiator | User clicks "Purchase" → calls x402PaymentService.purchaseArticle()  
  | frontend/src/services/x402PaymentService.ts:144-194 | Payment Orchestrator | 
    1) GET payment requirements (402) 
    2) Sign payment 
    3) Send X-PAYMENT header 

  | backend/src/routes.ts:484-573 | Payment Processor | 
    1) Return 402 requirements 
    2) Verify signature 
    3) Record payment  

  | backend/src/routes.ts:129-170 | Payment Requirements Builder | Constructs the payment spec (price, recipient, USDC address, etc.)  
  | *backend/src/routes.ts:30-34 | Facilitator Selector | Chooses CDP vs public facilitator based on API keys  
  | backend/src/database.ts:635-655 | Payment Tracker | Stores payment in payments table (prevents duplicate payments) 

  

  
  ## 402 Payment Required Payload (Server -> Frontend)
  {
      "x402Version": 1,
      "error": "X-PAYMENT header is required",
      "accepts": [
          {
              "scheme": "exact",
              "network": "base-sepolia",
              "maxAmountRequired": "120000",
              "resource": "http://localhost:3001/api/articles/2/purchase",
              "description": "Purchase access to: Building Scalable Web3 Applications with x402 Protocol",
              "mimeType": "application/json",
              "payTo": "0x25A6bd85966E9dE449cf36F7f6A033944C8bB5D8",
              "maxTimeoutSeconds": 60,
              "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
              "outputSchema": {
                  "input": {
                      "type": "http",
                      "method": "POST",
                      "discoverable": true
                  }
              },
              "extra": {
                  "name": "USDC",
                  "version": "2",
                  "title": "Purchase: Building Scalable Web3 Applications with x402 Protocol",
                  "category": "content",
                  "tags": [],
                  "serviceName": "Penny.io Article Access",
                  "serviceDescription": "Unlock full access to \"Building Scalable Web3 Applications with x402 Protocol\" by 0x25A6...B5D8",
                  "pricing": {
                      "currency": "USD",
                      "amount": "0.12",
                      "display": "$0.12"
                  }
              }
          }
      ]
  }

  ## CDP
    - Using coinbase CDP Facilitator ("Powered by Coinbase")
    - CDP Fallback:
        ✅ If you START the server WITHOUT CDP keys → Uses public facilitator
        ✅ If you START the server WITH CDP keys → Uses CDP facilitator
        ❌ If CDP facilitator GOES DOWN during runtime → Does NOT fallback (would just fail)
  

  ## !!! x402 & Penny.io Whitepapaer (for resources page / default article)


      1️⃣ "x402 only supports Base + USDC?"
      Short answer: In practice, YES (right now). In theory, NO (it's extensible).

      The Reality:

      x402 protocol is theoretically chain-agnostic (could work on any EVM chain)
      x402 protocol is theoretically asset-agnostic (could work with any ERC-20 token)
      But Coinbase's Implementation:

      ✅ Base (Coinbase's L2) - Primary focus
      ✅ Base Sepolia (testnet)
      ✅ USDC - Reference asset (stablecoin = predictable pricing)
      ⚠️ Other chains/tokens - Possible but not officially supported by Coinbase

      Why Base + USDC?

      Base = Ultra-low gas fees (~$0.0001 per transaction)
      USDC = Stablecoin ($1 = $1, predictable for content pricing)
      Coinbase ecosystem = Seamless fiat on/off-ramps
      Could you support ETH or other tokens? Technically yes, but:

      You'd need to build your own facilitator
      USDC is better for content pricing (no volatility)


      2️⃣ "x402 is gasless" - YES and NO
      This is where it gets interesting!

      For END USERS (Readers) - TRUE, Gasless! ✅
      When a reader buys an article:

      ❌ They DON'T pay gas fees
      ✅ They ONLY pay the article price ($0.05 USDC)
      ✅ They sign an authorization (not a transaction)
      For PLATFORM/AUTHOR - Someone Pays Gas 💰
      Here's the magic trick:

      Traditional Transaction:
        Reader → Pays $0.05 article + $0.001 gas = $0.051 total

      x402 Transaction:
        Reader → Signs authorization for $0.05
        Facilitator/Platform → Submits transaction on-chain, pays $0.001 gas
        Reader's wallet → Debited $0.05 (no gas!)
      Who pays the gas?

      The facilitator (Coinbase CDP) OR
      The merchant/platform (you) OR
      The author (whoever submits the authorization on-chain)
      On Base, gas is SO CHEAP (~$0.0001-$0.001) that it's negligible!

      This is called a meta-transaction pattern:

      User signs intent ("I authorize $0.05 USDC to Author X")
      Someone else executes it on-chain
      User's experience = gasless


      3️⃣ "x402 allows tiny transactions" - ABSOLUTELY TRUE ✅
      This is THE KEY feature!

      Traditional On-Chain Payments:
      Minimum viable payment = Gas cost + Value
        Example: $0.50 gas + $0.01 value = $0.51 total
        Result: $0.01 micropayments are IMPOSSIBLE (50x overhead!)
      x402 Micropayments:
      User pays: $0.01 (no gas!)
      Platform pays: $0.0001 gas (on Base L2)
      Result: $0.01 micropayments are PROFITABLE! (1% overhead)
      This is why x402 is revolutionary for content:

      You can charge $0.01-$0.05 per article
      Traditional blockchain payments would require $0.50+ minimum
      x402 makes microtransactions economically viable

      4️⃣ "Fast, efficient, FREE micropayments" - Almost!
      Let me refine your understanding:

      | Aspect | Reality | |--------|---------| 
      | Fast | ✅ YES - 2-3 second confirmation (vs 15+ seconds for traditional) 
      | Efficient | ✅ YES - Minimal overhead, batched transactions
      | Free for users | ✅ YES - Users pay $0 gas
      | Free for platform | ❌ NO - Platform pays ~$0.0001-$0.001 gas per payment (CDP COVERS FEES)
      | Micropayments | ✅ YES - $0.01+ payments are profitable 

      So it's not "free" - it's "gasless for users, negligible gas for facilitator"

      Example Economics:

      Article price: $0.05
      User pays: $0.05 (no gas)
      Platform pays: $0.0001 gas on Base
      Author receives: $0.05 (you could deduct gas, or absorb it)

      Profit margin: 99.8% (vs traditional payment processors at 97-98%)
      🔍 WHAT MAKES x402 SPECIAL FOR PENNY.IO
      Let me tie this together for your use case:

      Traditional Payment Methods:
      | Method | Fee Structure | Micropayment Viable? |
      | Stripe/PayPal | 2.9% + $0.30 flat fee | ❌ NO ($0.05 article = $0.35 total!)
      | Direct Crypto | User pays gas ($0.50-$5) | ❌ NO (gas exceeds content price) 
      | Lightning Network | Low fees but complex | ⚠️ Maybe (different UX, not web3-native) |

      x402 Payment Method:
      | Method | Fee Structure | Micropayment Viable? | |--------|---------------|---------------------| 
      | x402 on Base | ~$0.0001 gas (absorbed by platform) | ✅ YES! ($0.05 article = $0.05 to user)

      Your Value Prop:

      ✅ Instant payments (2-3 seconds, no blockchain confirmation wait)
      ✅ True micropayments ($0.01-$1.00 range works!)
      ✅ No signup required (wallet = identity)
      ✅ Gasless for readers (no crypto knowledge needed)
      ✅ Direct to authors (no intermediary holding funds)
      ✅ Programmable (autonomous agents can pay too!)


      💡 THE "AHA" MOMENT
      x402 is NOT about avoiding ALL costs - it's about:

      Moving gas burden from USER to PLATFORM (facilitator)

      Users don't need to understand gas
      Platform absorbs negligible gas costs
      Making micropayments economically viable

      $0.0001 gas on $0.05 payment = 0.2% overhead
      Traditional payment processors = 30-60% overhead at this scale
      Instant settlements

      No waiting for blockchain confirmations
      2-second payment experience
      Autonomous agent support

      AI agents can pay programmatically
      No human interaction needed

  ### Signatures
     No Signature Popup" - This is a FUNDAMENTAL MISUNDERSTANDING
     This is IMPOSSIBLE with blockchain security. Here's why:
     
     In blockchain, a signature = spending money. You CANNOT spend someone's money without their explicit approval. Period.
     
     BUT - Here's what you're CONFUSING:

    | Scenario | How It Works | Popup? | |----------|--------------|--------| 
    | Human User (your readers) | User clicks "Purchase" → Wallet popup → Sign → Payment processed | ✅ YES - Required for security  
    | Autonomous Agent (bots, scripts) | Agent has private key → Signs programmatically in code → No UI | ❌ NO - But only because bot has keys 

    x402 for Agents doesn't mean "no signature" - it means the agent signs programmatically using its private key in code (like wallet.signTypedData() in a script).

    For human users, the popup MUST exist. That's the security model of web3.

    HOWEVER - x402 IS optimized:

    Regular transaction: Sign → Wait for blockchain confirmation → Slow (15+ seconds)
    * x402 signature: Sign → Instant verification → Fast (~2 seconds)
    The popup is quick, but it EXISTS.



  ### Notes for now - authorization vs. settlement - will need to append the whitepaper

      * Note: CDP provides gassless settle() service. Using the provided CDP facilitator settle function. 
          ┌─────────────────────────────────────────────────────────────┐
          │ What You THINK Happened:                                    │
          │                                                             │
          │ 1. User signed transaction                                  │
          │ 2. 0.12 USDC transferred on-chain                           │
          │ 3. Author received USDC in their wallet                     │
          │ 4. Transaction hash recorded                                │
          └─────────────────────────────────────────────────────────────┘

          ┌─────────────────────────────────────────────────────────────┐
          │ What ACTUALLY Happened:                                     │
          │                                                             │
          │ 1. User signed an AUTHORIZATION (like signing a check)      │
          │ 2. Backend verified authorization is VALID                  │
          │ 3. Backend recorded "this user CAN pay 0.12 USDC"           │
          │ 4. NO on-chain transaction happened (yet!)                  │
          │ 5. USDC is STILL in user's wallet                           │
          └─────────────────────────────────────────────────────────────┘

          📝 ANALOGY: Checks vs Cash
          Think of it like this:

          | Traditional Blockchain | x402 Authorization | |----------------------|-------------------| 
          | Handing someone cash (instant transfer) | Writing a signed check (promise to pay)
          | Money moves immediately | Money moves when check is cashed
          | $0.50 gas per payment | $0.0001 gas when batching many checks 

          What you recorded in your database:

          ✅ User signed a valid authorization
          ✅ User HAS the USDC (facilitator verified)
          ✅ Authorization CAN be settled on-chain anytime
          ❌ Money hasn't actually moved yet

  
          verified an off-chain signature
          Transaction hash = proof of on-chain settlement
          Since no settlement occurred → NULL
          When would it NOT be NULL?

          After you submit the authorization on-chain (settlement)
          Then you'd update the record with the transaction hash
          2. "USDC didn't transfer to author wallet - Why?"
          BECAUSE NO SETTLEMENT HAPPENED! ✅

          What's in the user's wallet right now:

          The signed authorization (like a signed check)
          The USDC (still there, not moved)
          What the author needs to do to GET the USDC:

          Submit the authorization on-chain (cash the check)
          Pay gas fee (~$0.0001 on Base)
          Then USDC transfers to their wallet


  ### Authorization / Gas 
      
      * NOTE: Applicable to self-hosted facilitators. But still worth highlighting how fast these operations are. 
      
      🔍 WHO CAN "CASH THE CHECK"?
        Here's the beautiful thing about x402 authorizations:

        ANYONE can submit the authorization on-chain!

        Think of it like a signed check:

        The check is signed by the buyer (✅ valid signature)
        But ANYONE can walk into the bank and deposit it
        Whoever deposits it = whoever pays the gas

      📊 GAS COST REALITY CHECK

        | Scenario            | Gas Price   | Cost per Payment | 1,000 Payments | 10,000 Payments 
        | Base L2 (typical)   | ~0.001 Gwei | $0.00005         | $0.05          | $0.50 
        | Base L2 (congested) | ~0.01 Gwei  | $0.0001          | $0.10          | $1.00 

        Even at scale:

        10,000 purchases = $0.50-$1.00 total gas
        If avg article = $0.10, you earned $1,000
        Gas = 0.05-0.1% of revenue


  # 1
  ## 2 
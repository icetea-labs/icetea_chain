const { stateUtil, validate, expect } = require(';')
const Joi = require('@hapi/joi')

const { path } = stateUtil(this)

const state = {
    // list of providers
    provider: path('pr', {}),

    // list of packages
    pkg: path('pk', {}),

    // address - pkg - number of ticket
    card: path('ca', {}),

    // keep people deposits
    bank: path('ba', {})
}

@contract class iTee  {

    @view getProvider(pid: number) {
        return state.provider.get(pid)
    }

    @view getProviders(options) {
        return state.provider.query(options)
    }

    @view countProviders(options): number {
        return this.getProviders(options).length
    }

    // Add a provider, return the package ID
    // {"name": "FLC"}
    @transaction addProvider(value): number {
        value = validate(
            value,
            Joi.object({
              name: Joi.string().required(),
              img: Joi.string()
            }).required()
          )

        // add and return the new provider ID
        return state.provider.add(value)
    }

    @view getPackage(pkgId: number) {
        return state.pkg.get(pkgId)
    }

    @view getPackages(options) {
        return state.pkg.query(options)
    }

    @view countPackages(options): number {
        return this.getPackages(options).length
    }

    // Add a package, return the package ID
    // {"name": "FLC P1", "providerId": 0, "shareable": true, "shareTax": 0.2, "active": true, "price": 1, "initialTicket": 1000}
    @transaction addPackage(value): number {
        value = validate(
            value,
            Joi.object({
              providerId: Joi.number().integer().min(0).required(),
              name: Joi.string().required(),
              img: Joi.string(),
              shareable: Joi.boolean(),
              shareTax: Joi.number().positive(),
              expire: Joi.date().timestamp().raw(),
              validDuration: Joi.number().integer().positive(),
              initialTicket: Joi.number().positive().required(),
              sellStart:  Joi.date().timestamp().raw(),
              sellEnd:  Joi.date().timestamp().raw(),
              price: Joi.number().positive(),
              active: Joi.boolean()
            }).required()
          )

        // ensure valid providerId
        expect(state.provider.has(value.providerId), 'Non-existent providerId.')

        // check start date and end date
        expect(!value.sellEnd || value.sellEnd > block.timestamp, 'sellEnd must be in the future.')
        expect((!value.sellStart && !value.sellEnd) || value.sellEnd > value.sellStart, 'sellEnd must be greater than sellStart')

        // add and return the new package ID
        return state.pkg.add(value)
    }

    // update price/active/sellStart/sellEnd
    @transaction updatePackage (pkgId: number, value) {
        value = validate(
            value,
            Joi.object({
              name: Joi.string(),
              img: Joi.string(),
              shareable: Joi.boolean(),
              shareTax: Joi.number().positive(),
              expire: Joi.date().timestamp().raw(),
              validDuration: Joi.number().integer().positive(),
              initialTicket: Joi.number().positive(),
              sellStart:  Joi.date().timestamp().raw(),
              sellEnd:  Joi.date().timestamp().raw(),
              price: Joi.number().positive(),
              active: Joi.boolean()
            }).required()
        )

        // merge package data
        return state.pkg.mergeAt(pkgId, value)
    }

    @payable buy (pkgId: number): number {
        const p = state.pkg.get(pkgId)
        expect(p, 'Invalid pkgId.')
        expect(p.active, 'Package is inactive.')
        expect(!p.sellStart || (p.sellStart <= block.timestamp), 'Selling not started.')
        expect(!p.sellEnd || (p.sellEnd >= block.timestamp), 'Selling finished.')
        expect(!p.price || p.price < msg.value, 'Not enough msg.value.')

        const card = { 
            pkg: pkgId,
            owner: msg.sender,
            ticket: p.initialTicket
        }
        let expire = p.expire
        if (!expire && p.validDuration) {
            expire = block.timestamp + p.validDuration
        }
        if (expire) card.expire = expire

        const cardId = state.card.add(card)

        // move redundant value to bank
        const price = (!p.price || p.price < 0) ? 0 : p.price
        const redundant = msg.value - BigInt(price)

        if (redundant > 0) {
            state.bank.set(msg.sender, (v = 0n) => v + redundant)
        }

        return cardId
    }

    @view getCardByAddress(addr: ?address, options = {}) {
        addr = addr || msg.sender
        options.filter = card => card.owner === addr
        return state.card.query(options)
    }

    @payable share (cardId: number, receiver: address, sharedTicket: number): number {
        expect(sharedTicket > 0, 'Invalid sharedTicket')
        expect(msg.sender !== receiver, 'Cannot share to yourself.')

        const card = state.card.get(cardId)
        expect(card, 'Card not found.')
        expect(card.owner === msg.sender, 'Not your card.')
        expect(!card.expire || card.expire <= block.timestamp, 'Cannot share expired card.')

        const { shareable, shareTax } = state.pkg.get(card.pkg)
        expect(shareable, 'Card is not shareable.')

        let givingAmount = sharedTicket
        if (shareTax) {
            givingAmount += givingAmount * shareTax
        }

        expect(card.ticket >= givingAmount, 'Not enough ticket.')
        
        state.card.set([cardId, 'ticket'], card.ticket - givingAmount)
        const newCard = {
            pkg: card.pkg,
            owner: receiver,
            ticket: sharedTicket,
            sharedBy: msg.sender
        }
        return state.card.add(newCard)
    }

    @payable @onreceive deposit() {
        return state.bank.set(msg.sender, (v = 0n) => v + msg.value)
    }

    @view getDepositedAmount(addr: ?address) {
        addr = addr || msg.sender
        return state.bank.get(addr, 0n)
    }

    @transaction withdraw(amount: bigint | number | string) {
        amount = BigInt(amount)
        const deposit = state.bank.get(msg.sender, 0n)
        expect(deposit >= amount, 'Not enough balance.')

        state.bank.set(msg.sender, deposit - amount)
        this.transfer(msg.sender, amount)
    }
}

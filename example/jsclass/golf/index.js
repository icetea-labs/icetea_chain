const { stateUtil, validate, expect } = require(';')
const Joi = require('@hapi/joi')

const { path } = stateUtil(this)

const state = {
    // list of provider
    provider: path('pr', {}),

    // list of packages
    pkg: path('pk', {}),

    // address - pkgId - number of ticket
    card: path('ca', {})
}

@contract class iTee  {

    @view getProvider(pid: number) {
        return state.provider.get(pid)
    }

    @view countProviders(options) {
        return state.provider.count(options)
    }

    // example
    @view getProviders(options) {
        return state.provider.query(options)
    }

    // Add a provider, return the package ID
    @transaction addProvider(value) {
        value = validate(
            value,
            Joi.object({
              name: Joi.string().required(),
              value: Joi.string(),
            }).required()
          )

        // add, which generated a new ID
        return state.provider.add(value)
    }

    @view getPackage(pkgId: number) {
        return state.pkg.get(pkgId)
    }

    // example
    @view getPackages(options) {
        return state.pkg.query(options)
    }

    // Add a package, return the package ID
    @transaction addPackage(value) {
        value = validate(
            value,
            Joi.object({
              providerId: Joi.number().integer().min(0).required(),
              name: Joi.string().required(),
              img: Joi.string(),
              sharable: Joi.boolean(),
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

        // add, which generated a new ID
        return state.pkg.add(value)
    }

    // update price/active/sellStart/sellEnd
    @transaction updatePackage (pkgId: number, data) {
        // TODO: validate

        // merge package data
        return state.pkg.mergeAt(pkgId, data)
    }

    @payable buy (pkgId: number) {
        const p = state.pkg.get(pkgId)
        expect(p, 'Invalid pkgId.')
        expect(p.active, 'Package is inactive.')
        expect(!p.sellStart || (p.sellStart <= block.timestamp), 'Selling not started.')
        expect(!p.sellEnd || (p.sellEnd >= block.timestamp), 'Selling finished.')
        expect(!p.price || p.price < msg.value, 'Not enough msg.value.')

        const card = { 
            pkgId,
            owner: msg.sender,
            ticket: p.initialTicket
        }
        let expire = p.expire
        if (!expire && p.validDuration) {
            expire = block.timestamp + p.validDuration
        }
        if (expire) card.expire = expire

        return state.card.add(card)
    }

    @view getCardByAddress(addr: ?address, options = {}) {
        addr = addr || msg.sender
        options.filter = card => card.owner === addr
        return state.card.query(options)
    }

    @payable share (cardId: number, receiver: address, sharedTicket: number) {
        expect(sharedTicket > 0, 'Invalid sharedTicket')
        const p = state.pkg.get(pkgId)
        expect(p, 'Invalid pkgId.')

        const card = state.card.get(cardId)
        expect(card, 'Card not found.')
        expect(!card.expire || card.expire <= block.timestamp, 'Cannot share expired card.')
        expect(card.sharable, 'Card is not sharable.')

        let sharedAmount = sharedTicket
        if (card.shareTax) {
            sharedAmount += sharedAmount * card.shareTax
        }

        expect(card.ticket >= sharedAmount, 'Not enough ticket.')
        
        state.card.set([cardId, 'ticket'], card.ticket - sharedAmount)
        const newCard = {
            pkgId: card.pkgId,
            owner: receiver,
            ticket: sharedAmount,
            sharedBy: msg.sender
        }
        return state.card.add(newCard)
    }
}

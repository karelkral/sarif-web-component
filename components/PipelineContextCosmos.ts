// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {CosmosClient, Container} from '@azure/cosmos'
import {observable, observe} from 'mobx'
import {PipelineContext, Thread} from './PipelineContext'

export class PipelineContextCosmos implements PipelineContext {
	private container: Container
	@observable public threads = [] as Thread[]
	@observable public reviews = null
	@observable public showReviewUpdated = false
	@observable public reviewRevision = 0

	public constructor(readonly pipelineId: string) {
		if (!pipelineId) throw new Error()

		const client = new CosmosClient({
			endpoint: '',
			key: ''
		})

		;(async () => {
			const container = this.container = await client
				.database('demo')
				.container('demoContainer')

			const {resources} = await container
				.items
				.query(`SELECT * FROM c WHERE c.id = "${pipelineId}"`)
				.fetchAll()

			const storedDef = resources[0]
			this.threads = storedDef?.threads?.map(thread => {
				const threadObject = new Thread(thread.disposition, thread.keywords)
				threadObject.comments = thread.comments?.map(comment => {
					comment.when = new Date(comment.when)
					return comment
				}) ?? []
				return threadObject
			}) ?? []
			this.reviews = storedDef?.results || {}

			observe(this.threads, () => this.publish())
			observe(this.reviews, () => this.publish()) // Deprecated.
		})()
	}

	public publish() {
		this.container
			.item(this.pipelineId, 'foo')
			.replace({
				id: this.pipelineId,
				key: 'foo',
				threads: this.threads,
				results: this.reviews,
			})
	}
}

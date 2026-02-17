"use client"

import { cn } from "@/lib/utils"
import type { ScoreByHole, Round } from "@/lib/scores"
import type { Hole } from "@/lib/types"

function HoleScoreCell({ score }: { score: ScoreByHole }) {
	return (
		<div className="score-cell">
			<span className={cn("score-mark", score.relativeScoreName())}>{score.score}</span>
		</div>
	)
}

function AverageScoreCell({ score }: { score: ScoreByHole }) {
	return <div className="score-cell">{score.score}</div>
}

function RoundTotal({ scores, places }: { scores: ScoreByHole[]; places: number }) {
	const total = scores.reduce((sum, s) => sum + +s.score, 0)
	const par = scores.reduce((sum, s) => sum + s.hole.par, 0)
	return (
		<div className={cn("score-cell font-semibold", total < par ? "below-par" : "above-par")}>
			{total.toFixed(places)}
		</div>
	)
}

function HoleNumbers({ holes }: { holes: Hole[] }) {
	return (
		<div className="score-row">
			<div className="score-label" />
			<div className="score-cells">
				{holes.map((hole) => (
					<div key={hole.id} className="score-cell font-semibold">
						{hole.hole_number}
					</div>
				))}
				<div className="score-cell font-semibold" />
			</div>
		</div>
	)
}

function HolePars({ holes }: { holes: Hole[] }) {
	const totalPar = holes.reduce((sum, h) => sum + h.par, 0)
	return (
		<div className="score-row">
			<div className="score-label" />
			<div className="score-cells">
				{holes.map((hole) => (
					<div key={hole.id} className="score-cell bg-muted">
						{hole.par}
					</div>
				))}
				<div className="score-cell bg-muted font-semibold">{totalPar}</div>
			</div>
		</div>
	)
}

function RoundScores({ round, scoreType }: { round: Round; scoreType: string }) {
	return (
		<div className="score-row">
			<div className={cn("score-label", scoreType === "Net" && "italic")}>{round.eventDate}</div>
			<div className="score-cells">
				{round.scores.map((score) => (
					<HoleScoreCell key={score.hole.id} score={score} />
				))}
				<RoundTotal scores={round.scores} places={0} />
			</div>
		</div>
	)
}

function AverageRow({ scores }: { scores: ScoreByHole[] }) {
	return (
		<div className="score-row">
			<div className="score-label">Average</div>
			<div className="score-cells">
				{scores.map((score) => (
					<AverageScoreCell key={score.hole.id} score={score} />
				))}
				<RoundTotal scores={scores} places={1} />
			</div>
		</div>
	)
}

function BestBallRow({ scores }: { scores: ScoreByHole[] }) {
	return (
		<div className="score-row">
			<div className="score-label">Best Ball</div>
			<div className="score-cells">
				{scores.map((score) => (
					<HoleScoreCell key={score.hole.id} score={score} />
				))}
				<RoundTotal scores={scores} places={0} />
			</div>
		</div>
	)
}

interface ScoreGridProps {
	holes: Hole[]
	grossRounds: Round[]
	netRounds: Round[]
	scoreType: "gross" | "net" | "both"
	averageScores: ScoreByHole[]
	bestScores: ScoreByHole[]
}

export function ScoreGrid({
	holes,
	grossRounds,
	netRounds,
	scoreType,
	averageScores,
	bestScores,
}: ScoreGridProps) {
	const showGross = scoreType === "gross" || scoreType === "both"
	const rounds = showGross ? grossRounds : netRounds

	if (rounds.length === 0) {
		return <p className="p-4 text-sm text-muted-foreground">No rounds played</p>
	}

	return (
		<div className="scorecard overflow-x-auto">
			<HoleNumbers holes={holes} />
			<HolePars holes={holes} />
			{scoreType === "both"
				? grossRounds.map((grossRound) => {
						const netRound = netRounds.find((r) => r.eventDate === grossRound.eventDate)
						return (
							<div key={grossRound.eventDate}>
								<RoundScores round={grossRound} scoreType="Gross" />
								{netRound && <RoundScores round={netRound} scoreType="Net" />}
							</div>
						)
					})
				: rounds.map((round) => (
						<RoundScores
							key={round.eventDate}
							round={round}
							scoreType={showGross ? "Gross" : "Net"}
						/>
					))}
			<div className="my-2 border-t" />
			<AverageRow scores={averageScores} />
			<BestBallRow scores={bestScores} />
		</div>
	)
}

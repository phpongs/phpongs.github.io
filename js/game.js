/*
    author: Pongs Phimnualsri
    no.:    A01364284
    date:   2024.11.25
    notes:  final-project
*/

class DiceGame {
    constructor() {
        this.currentRound = -1;
        this.maxRounds = 2;
        this.playerTotal = 0;
        this.computerTotal = 0;
        this.gameOver = false;

        this.elements = {
            playerDice1: document.getElementById('playerDice1'),
            playerDice2: document.getElementById('playerDice2'),
            computerDice1: document.getElementById('computerDice1'),
            computerDice2: document.getElementById('computerDice2'),
            playerRoundScore: document.getElementById('playerRoundScore'),
            computerRoundScore: document.getElementById('computerRoundScore'),
            playerTotalScore: document.getElementById('playerTotalScore'),
            computerTotalScore: document.getElementById('computerTotalScore'),
            rollButton: document.getElementById('rollButton'),
            resetButton: document.getElementById('resetButton'),
            currentRound: document.getElementById('currentRound'),
            message: document.getElementById('message'),
            popup: document.getElementById('popup')
        };

        // Image filenames Array
        this.diceImages = [
            'dice-six-faces-one',
            'dice-six-faces-two',
            'dice-six-faces-three',
            'dice-six-faces-four',
            'dice-six-faces-five',
            'dice-six-faces-six'
        ];

        // Event listeners
        this.elements.rollButton.addEventListener('click', () => this.playRound());
        this.elements.resetButton.addEventListener('click', () => this.resetGame());
        
        // Show rules popup on load
        this.showRulesPopup();
    }

    // Roll dice
    rollDice() {
        return Math.floor(Math.random() * 6) + 1;
    }

    // Calculate score
    calculateScore(dice1, dice2) {
        if (dice1 === 1 || dice2 === 1) {
            return 0;
        }
        if (dice1 === dice2) {
            return (dice1 + dice2) * 2;
        }
        return dice1 + dice2;
    }

    // Update the dice images
    async updateDiceImages(player, finalDice1, finalDice2) {
        const prefix = player === 'player' ? 'player' : 'computer';
        const dice1Element = this.elements[prefix + 'Dice1'];
        const dice2Element = this.elements[prefix + 'Dice2'];
        
        // Roll animation with random faces
        for(let i = 0; i < 10; i++) {
            const random1 = Math.floor(Math.random() * 6);
            const random2 = Math.floor(Math.random() * 6);
            
            dice1Element.src = `images/${this.diceImages[random1]}.svg`;
            dice2Element.src = `images/${this.diceImages[random2]}.svg`;
            dice1Element.style.animation = 'rollDice 0.2s ease-out';
            dice2Element.style.animation = 'rollDice 0.2s ease-out';
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            dice1Element.style.animation = 'none';
            dice2Element.style.animation = 'none';
        }
        
        // Show final result
        dice1Element.src = `images/${this.diceImages[finalDice1 - 1]}.svg`;
        dice2Element.src = `images/${this.diceImages[finalDice2 - 1]}.svg`;
    }

    // Play a single round
    async playRound() {
        if (this.gameOver) return;

        // Disable roll button during entire animation sequence
        this.elements.rollButton.disabled = true;

        // Roll dice for player and computer
        const playerDice1 = this.rollDice();
        const playerDice2 = this.rollDice();
        const computerDice1 = this.rollDice();
        const computerDice2 = this.rollDice();

        // Calculate scores (but don't display yet)
        const playerScore = this.calculateScore(playerDice1, playerDice2);
        const computerScore = this.calculateScore(computerDice1, computerDice2);

        // Reset round scores to create anticipation
        this.elements.playerRoundScore.textContent = '0';
        this.elements.computerRoundScore.textContent = '0';

        // Animate player dice first
        await this.updateDiceImages('player', playerDice1, playerDice2);
        
        // Show player's round score with a fade effect
        $(this.elements.playerRoundScore).fadeOut(50, function() {
            $(this).text(playerScore).fadeIn(50);
        });
        
        this.playerTotal += playerScore;
        
        $(this.elements.playerTotalScore).fadeOut(50, () => {
            $(this.elements.playerTotalScore)
                .text(this.playerTotal).fadeIn(50);
        });

        // Animate computer dice
        await this.updateDiceImages('computer', computerDice1, computerDice2);
        
        // Show computer's round score with a fade effect
        $(this.elements.computerRoundScore).fadeOut(50, function() {
            $(this).text(computerScore).fadeIn(50);
        });

        // Update total scores with animation
        this.computerTotal += computerScore;

        $(this.elements.computerTotalScore).fadeOut(50, () => {
            $(this.elements.computerTotalScore)
                .text(this.computerTotal).fadeIn(50);
        });

        // Round counter++
        this.currentRound++;
        $(this.elements.currentRound)
                .text(this.currentRound + 1);

        // Wait for all animations to complete
        await new Promise(resolve => setTimeout(resolve, 50));

        // Check if game is over
        if (this.currentRound >= this.maxRounds) {
            this.endGame();
        } else {
            // Re-enable roll button if game isn't over
            this.elements.rollButton.disabled = false;
        }
    }
    
    // End the game and show winner
    endGame() {
        this.gameOver = true;
        this.elements.rollButton.disabled = true;
        this.elements.resetButton.disabled = false;

        let message = '';
        if (this.playerTotal > this.computerTotal) {
            message = 'Nah, You win<br><span class="emoji">🙄</span>';
        } else if (this.playerTotal < this.computerTotal) {
            message = 'Com wins!<br>You are the Loser!<br><span class="emoji">😉</span>';
        } else {
            message = 'Tie!<br><span class="emoji">🤝</span>';
        }

        this.elements.message.innerHTML = message;
    }

    // Reset game
    resetGame() {
        this.currentRound = -1;
        this.playerTotal = 0;
        this.computerTotal = 0;
        this.gameOver = false;

        this.elements.playerRoundScore.textContent = '0';
        this.elements.computerRoundScore.textContent = '0';
        this.elements.playerTotalScore.textContent = '0';
        this.elements.computerTotalScore.textContent = '0';
        this.elements.currentRound.textContent = "0";
        this.elements.message.innerHTML = '';
        this.elements.rollButton.disabled = false;
        this.elements.resetButton.disabled = false;

        this.updateDiceImages('player', 1, 1);
        this.updateDiceImages('computer', 1, 1);
    }

    // Show popup
    showRulesPopup() {
        $(this.elements.popup).fadeIn().addClass('fade-in');

        // Close popup
        $('.close-btn').on('click', () => {
            $(this.elements.popup).fadeOut().removeClass('fade-in');
        });
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new DiceGame();
});
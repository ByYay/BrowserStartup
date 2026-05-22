let calculatorDisplay = '0';
let calculatorPrevious = null;
let calculatorOperation = null;
let calculatorWaitingForNumber = false;
let calculatorSecondary = '';

function updateCalculatorDisplay() {
    const display = document.getElementById('calculatorDisplay');
    const secondary = document.getElementById('calculatorSecondary');
    
    let displayValue = calculatorDisplay;
    if (displayValue.length > 12) {
        displayValue = parseFloat(displayValue).toExponential(6);
    }
    
    display.textContent = displayValue;
    secondary.textContent = calculatorSecondary;
}

function appendToDisplay(value) {
    if (value === '±') {
        if (calculatorDisplay !== '0') {
            calculatorDisplay = calculatorDisplay.startsWith('-') 
                ? calculatorDisplay.substring(1)
                : '-' + calculatorDisplay;
        }
        updateCalculatorDisplay();
        return;
    }
    
    if (value === '%') {
        calculatorDisplay = (parseFloat(calculatorDisplay) / 100).toString();
        updateCalculatorDisplay();
        return;
    }
    
    if (['+', '-', '*', '/'].includes(value)) {
        setOperation(value);
        return;
    }
    
    if (calculatorWaitingForNumber) {
        calculatorDisplay = value;
        calculatorWaitingForNumber = false;
    } else {
        if (value === '.' && calculatorDisplay.includes('.')) {
            return;
        }
        calculatorDisplay = calculatorDisplay === '0' ? value : calculatorDisplay + value;
    }
    updateCalculatorDisplay();
}

function clearCalculator() {
    calculatorDisplay = '0';
    calculatorPrevious = null;
    calculatorOperation = null;
    calculatorWaitingForNumber = false;
    calculatorSecondary = '';
    updateCalculatorDisplay();
    clearOperatorHighlight();
}

function backspace() {
    if (calculatorDisplay.length > 1) {
        calculatorDisplay = calculatorDisplay.slice(0, -1);
    } else {
        calculatorDisplay = '0';
    }
    updateCalculatorDisplay();
}

function clearEntry() {
    calculatorDisplay = '0';
    updateCalculatorDisplay();
}

function setOperation(operation) {
    if (calculatorPrevious !== null && calculatorOperation !== null && !calculatorWaitingForNumber) {
        calculateResult();
    }
    
    calculatorPrevious = calculatorDisplay;
    calculatorOperation = operation;
    calculatorWaitingForNumber = true;
    
    const operatorSymbol = operation === '*' ? '×' : operation;
    calculatorSecondary = `${calculatorPrevious} ${operatorSymbol}`;
    updateCalculatorDisplay();
    
    highlightOperator(operation);
}

function calculateResult() {
    if (calculatorPrevious !== null && calculatorOperation !== null && !calculatorWaitingForNumber) {
        const current = parseFloat(calculatorDisplay);
        const previous = parseFloat(calculatorPrevious);
        
        let result;
        switch (calculatorOperation) {
            case '+':
                result = previous + current;
                break;
            case '-':
                result = previous - current;
                break;
            case '*':
                result = previous * current;
                break;
            case '/':
                if (current === 0) {
                    calculatorDisplay = 'Error';
                    calculatorSecondary = 'Division by zero';
                    updateCalculatorDisplay();
                    return;
                }
                result = previous / current;
                break;
            default:
                return;
        }
        
        const operatorSymbol = calculatorOperation === '*' ? '×' : calculatorOperation;
        calculatorSecondary = `${calculatorPrevious} ${operatorSymbol} ${calculatorDisplay} =`;
        
        calculatorDisplay = result.toString();
        calculatorPrevious = null;
        calculatorOperation = null;
        calculatorWaitingForNumber = true;
        updateCalculatorDisplay();
        clearOperatorHighlight();
    }
}

function highlightOperator(operation) {
    clearOperatorHighlight();
    
    const operators = document.querySelectorAll('.calc-btn.operator');
    operators.forEach(btn => {
        const btnText = btn.textContent;
        if ((operation === '*' && btnText === '×') || 
            (operation === '/' && btnText === '/') ||
            (operation === '+' && btnText === '+') ||
            (operation === '-' && btnText === '-')) {
            btn.classList.add('active');
        }
    });
}

function clearOperatorHighlight() {
    const operators = document.querySelectorAll('.calc-btn.operator');
    operators.forEach(btn => btn.classList.remove('active'));
}

function handleCalculatorKeyboard(event) {
    const searchInput = document.getElementById('searchInput');
    const isSearchFocused = document.activeElement === searchInput;
    
    if (isSearchFocused) {
        return;
    }
    
    if (!document.getElementById('calculatorWidget').classList.contains('active')) {
        return;
    }
    
    const key = event.key;
    
    if ('0123456789+-*/.%='.includes(key) || key === 'Enter' || key === 'Escape' || key === 'Backspace' || key === 'c' || key === 'C') {
        event.preventDefault();
    }
    
    let button = document.querySelector(`[data-key="${key}"]`);
    
    if (key === 'Enter') {
        button = document.querySelector(`[data-key="Enter"]`);
    }
    
    if (key === 'Escape') {
        button = document.querySelector(`[data-key="Escape"]`);
    }
    
    if (key === 'Backspace') {
        button = document.querySelector(`[data-key="Backspace"]`);
    }
    
    if (button) {
        button.classList.add('pressed');
        button.classList.add('pressed');
        setTimeout(() => {
            button.classList.remove('pressed');
        }, 150);
    }
    
    if (key >= '0' && key <= '9') {
        appendToDisplay(key);
    } else if (key === '.') {
        appendToDisplay('.');
    } else if (['+', '-', '*', '/'].includes(key)) {
        appendToDisplay(key);
    } else if (key === 'Enter' || key === '=') {
        calculateResult();
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
        clearCalculator();
    } else if (key === 'Backspace') {
        backspace();
    }
}

document.addEventListener('keydown', handleCalculatorKeyboard);

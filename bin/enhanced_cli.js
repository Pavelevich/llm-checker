#!/usr/bin/env node
const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { table } = require('table');
const os = require('os');
const { spawn } = require('child_process');
const LLMChecker = require('../src/index');
const { getLogger } = require('../src/utils/logger');

const program = new Command();

program
    .name('llm-checker')
    .description('Check which LLM models your computer can run')
    .version('2.1.0');

const logger = getLogger({ console: false });

// Ollama installation helper
function getOllamaInstallInstructions() {
    const platform = os.platform();
    const arch = os.arch();
    
    const instructions = {
        'darwin': {
            name: 'macOS',
            downloadUrl: 'https://ollama.com/download/mac',
            instructions: [
                '1. Download Ollama for macOS from the link above',
                '2. Open the downloaded .pkg file and follow the installer',
                '3. Once installed, open Terminal and run: ollama serve',
                '4. In a new terminal window, test with: ollama run llama2:7b'
            ],
            alternativeInstall: 'brew install ollama'
        },
        'win32': {
            name: 'Windows',
            downloadUrl: 'https://ollama.com/download/windows',
            instructions: [
                '1. Download Ollama for Windows from the link above',
                '2. Run the downloaded installer (.exe file)',
                '3. Open Command Prompt or PowerShell',
                '4. Test with: ollama run llama2:7b'
            ],
            alternativeInstall: 'winget install Ollama.Ollama'
        },
        'linux': {
            name: 'Linux',
            downloadUrl: 'https://ollama.com/download/linux',
            instructions: [
                '1. Run the installation script:',
                '   curl -fsSL https://ollama.com/install.sh | sh',
                '2. Start Ollama service:',
                '   sudo systemctl start ollama',
                '3. Test with: ollama run llama2:7b'
            ],
            alternativeInstall: 'Manual install: https://github.com/ollama/ollama/blob/main/docs/linux.md'
        }
    };
    
    return instructions[platform] || instructions['linux'];
}

function displayOllamaInstallHelp() {
    const installInfo = getOllamaInstallInstructions();
    
    console.log(chalk.red.bold('\n❌ Ollama is not installed or not running!'));
    console.log(chalk.yellow('\n🚀 LLM Checker requires Ollama to function properly.'));
    console.log(chalk.cyan.bold(`\n📥 Install Ollama for ${installInfo.name}:`));
    console.log(chalk.blue(`\n🔗 Download: ${installInfo.downloadUrl}`));
    
    console.log(chalk.green.bold('\n📋 Installation Steps:'));
    installInfo.instructions.forEach(step => {
        console.log(chalk.gray(`   ${step}`));
    });
    
    if (installInfo.alternativeInstall) {
        console.log(chalk.magenta.bold('\n⚡ Quick Install (if available):'));
        console.log(chalk.white(`   ${installInfo.alternativeInstall}`));
    }
    
    console.log(chalk.yellow.bold('\n✅ After installation:'));
    console.log(chalk.gray('   1. Restart your terminal'));
    console.log(chalk.gray('   2. Run: llm-checker check'));
    console.log(chalk.gray('   3. Start using the AI model selector!'));
    
    console.log(chalk.cyan('\n💡 Need help? Visit: https://github.com/ollama/ollama'));
}

async function checkOllamaAndExit() {
    const spinner = ora('Checking Ollama availability...').start();
    
    try {
        // Quick check if ollama command exists
        const checkCommand = os.platform() === 'win32' ? 'where' : 'which';
        
        return new Promise((resolve) => {
            const proc = spawn(checkCommand, ['ollama'], { stdio: 'pipe' });
            
            proc.on('close', (code) => {
                spinner.stop();
                if (code !== 0) {
                    displayOllamaInstallHelp();
                    process.exit(1);
                }
                resolve(true);
            });
            
            proc.on('error', () => {
                spinner.stop();
                displayOllamaInstallHelp();
                process.exit(1);
            });
        });
    } catch (error) {
        spinner.stop();
        displayOllamaInstallHelp();
        process.exit(1);
    }
}

function getStatusIcon(model, ollamaModels) {
    const ollamaModel = ollamaModels?.find(om => om.matchedModel?.name === model.name);

    if (ollamaModel?.isRunning) return '🚀';
    if (ollamaModel?.isInstalled) return '📦';

    if (model.specialization === 'code') return '💻';
    if (model.specialization === 'multimodal' || model.multimodal) return '🖼️';
    if (model.specialization === 'embeddings') return '🧲';
    if (model.category === 'ultra_small') return '🐣';
    if (model.category === 'small') return '🐤';
    if (model.category === 'medium') return '🐦';
    if (model.category === 'large') return '🦅';

    return '-';
}

function formatSize(size) {
    if (!size) return 'Unknown';

    const cleanSize = size.replace(/[^\d.BMK]/gi, '');
    const numMatch = cleanSize.match(/(\d+\.?\d*)/);
    const unitMatch = cleanSize.match(/[BMK]/i);

    if (numMatch && unitMatch) {
        const num = parseFloat(numMatch[1]);
        const unit = unitMatch[0].toUpperCase();
        return `${num}${unit}`;
    }

    return size;
}

// Helper function to calculate model compatibility score
function calculateModelCompatibilityScore(model, hardware) {
    let score = 50; // Base score
    
    // Estimar tamaño del modelo
    const sizeMatch = model.model_identifier.match(/(\d+\.?\d*)[bm]/i);
    let modelSizeB = 1; // Default 1B
    
    if (sizeMatch) {
        const num = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[0].slice(-1).toLowerCase();
        modelSizeB = unit === 'm' ? num / 1000 : num;
    }
    
    // Calcular requerimientos estimados
    const estimatedRAM = modelSizeB * 1.2; // 1.2x el tamaño del modelo
    const ramRatio = hardware.memory.total / estimatedRAM;
    
    // Puntuación por compatibilidad de RAM (40% del score)
    if (ramRatio >= 3) score += 40;
    else if (ramRatio >= 2) score += 30;
    else if (ramRatio >= 1.5) score += 20;
    else if (ramRatio >= 1.2) score += 10;
    else if (ramRatio >= 1) score += 5;
    else score -= 20; // Penalización por RAM insuficiente
    
    // Puntuación por tamaño del modelo (30% del score)
    if (modelSizeB <= 1) score += 30; // Modelos pequeños funcionan en cualquier lado
    else if (modelSizeB <= 3) score += 25;
    else if (modelSizeB <= 7) score += 20;
    else if (modelSizeB <= 13) score += 15;
    else if (modelSizeB <= 30) score += 10;
    else score -= 10; // Modelos muy grandes
    
    // Puntuación por CPU cores (20% del score)
    if (hardware.cpu.cores >= 12) score += 20;
    else if (hardware.cpu.cores >= 8) score += 15;
    else if (hardware.cpu.cores >= 6) score += 10;
    else if (hardware.cpu.cores >= 4) score += 5;
    
    // Bonus por popularidad (10% del score)
    const pulls = model.pulls || 0;
    if (pulls > 1000000) score += 10;
    else if (pulls > 100000) score += 7;
    else if (pulls > 10000) score += 5;
    else if (pulls > 1000) score += 3;
    
    // Bonus especial para Apple Silicon
    if (hardware.cpu.architecture === 'Apple Silicon') {
        score += 5;
        // Bonus extra para modelos optimizados
        const modelName = model.model_identifier.toLowerCase();
        if (modelName.includes('llama') || modelName.includes('mistral') || 
            modelName.includes('phi') || modelName.includes('gemma')) {
            score += 3;
        }
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
}

// Helper function to get hardware tier for display
function getHardwareTierForDisplay(hardware) {
    const ram = hardware.memory.total;
    const cores = hardware.cpu.cores;
    
    if (ram >= 64 && cores >= 16) return 'EXTREME';
    if (ram >= 32 && cores >= 12) return 'VERY HIGH';
    if (ram >= 16 && cores >= 8) return 'HIGH';
    if (ram >= 8 && cores >= 4) return 'MEDIUM';
    if (ram >= 4 && cores >= 2) return 'LOW';
    
    // Casos especiales
    if (ram >= 16 && ram < 32 && cores >= 12) return 'HIGH';
    if (ram >= 32 && ram < 64 && cores >= 8) return 'VERY HIGH';
    
    return 'ULTRA LOW';
}

function formatSpeed(speed) {
    const speedMap = {
        'very_fast': 'very_fast',
        'fast': 'fast',
        'medium': 'medium',
        'slow': 'slow',
        'very_slow': 'very_slow'
    };
    return speedMap[speed] || (speed || 'unknown');
}

function getScoreColor(score) {
    if (score >= 90) return chalk.green;
    if (score >= 75) return chalk.yellow;
    if (score >= 60) return chalk.hex('#FFA500');
    return chalk.red;
}

function getOllamaCommand(modelName) {
    const mapping = {
        'TinyLlama 1.1B': 'tinyllama:1.1b',
        'Qwen 0.5B': 'qwen:0.5b',
        'Gemma 2B': 'gemma2:2b',
        'Phi-3 Mini 3.8B': 'phi3:mini',
        'Llama 3.2 3B': 'llama3.2:3b',
        'Llama 3.1 8B': 'llama3.1:8b',
        'Mistral 7B v0.3': 'mistral:7b',
        'CodeLlama 7B': 'codellama:7b',
        'Qwen 2.5 7B': 'qwen2.5:7b'
    };

    return mapping[modelName] || '-';
}

function displaySystemInfo(hardware, analysis) {
    const cpuColor = hardware.cpu.cores >= 8 ? chalk.green : hardware.cpu.cores >= 4 ? chalk.yellow : chalk.red;
    const ramColor = hardware.memory.total >= 32 ? chalk.green : hardware.memory.total >= 16 ? chalk.yellow : chalk.red;
    const gpuColor = hardware.gpu.dedicated ? chalk.green : chalk.hex('#FFA500');

    const lines = [
        `${chalk.cyan('CPU:')} ${cpuColor(hardware.cpu.brand)} ${chalk.gray(`(${hardware.cpu.cores} cores, ${hardware.cpu.speed}GHz)`)}`,
        `${chalk.cyan('Architecture:')} ${hardware.cpu.architecture}`,
        `${chalk.cyan('RAM:')} ${ramColor(hardware.memory.total + 'GB')}`,
        `${chalk.cyan('GPU:')} ${gpuColor(hardware.gpu.model || 'Not detected')}`,
        `${chalk.cyan('VRAM:')} ${hardware.gpu.vram === 0 && hardware.gpu.model && hardware.gpu.model.toLowerCase().includes('apple') ? 'Unified Memory' : `${hardware.gpu.vram || 'N/A'}GB`}${hardware.gpu.dedicated ? chalk.green(' (Dedicated)') : chalk.hex('#FFA500')(' (Integrated)')}`,
    ];

    const tier = analysis.summary.hardwareTier?.replace('_', ' ').toUpperCase() || 'UNKNOWN';
    const tierColor = tier.includes('HIGH') ? chalk.green : tier.includes('MEDIUM') ? chalk.yellow : chalk.red;

    lines.push(`🏆 ${chalk.bold('Hardware Tier:')} ${tierColor.bold(tier)}`);

    console.log('\n' + chalk.bgBlue.white.bold(' 🖥️  SYSTEM INFORMATION '));
    console.log(chalk.blue('╭' + '─'.repeat(50)));

    lines.forEach(line => {
        console.log(chalk.blue('│') + ' ' + line);
    });

    console.log(chalk.blue('╰'));
}

function displayOllamaIntegration(ollamaInfo, ollamaModels) {
    const lines = [];

    if (ollamaInfo.available) {
        lines.push(`${chalk.green('✅ Status:')} Running ${chalk.gray(`(v${ollamaInfo.version || 'unknown'})`)}`);

        if (ollamaModels && ollamaModels.length > 0) {
            const compatibleCount = ollamaModels.filter(m => {
                return m.canRun === true ||
                    m.compatibilityScore >= 60 ||
                    (m.matchedModel && true);
            }).length;

            const runningCount = ollamaModels.filter(m => m.isRunning).length;

            lines.push(`📦 ${chalk.cyan('Installed:')} ${ollamaModels.length} total, ${chalk.green(compatibleCount)} compatible`);
            if (runningCount > 0) {
                lines.push(`🚀 ${chalk.cyan('Running:')} ${chalk.green(runningCount)} models`);
            }
        } else {
            lines.push(`📦 ${chalk.gray('No models installed yet')}`);
        }
    } else {
        lines.push(`${chalk.red('❌ Status:')} Not available`);
    }

    console.log('\n' + chalk.bgMagenta.white.bold(' 🦙 OLLAMA INTEGRATION '));
    console.log(chalk.hex('#a259ff')('╭' + '─'.repeat(50)));

    lines.forEach(line => {
        console.log(chalk.hex('#a259ff')('│') + ' ' + line);
    });

    console.log(chalk.hex('#a259ff')('╰'));
}

function displayEnhancedCompatibleModels(compatible, ollamaModels) {
    if (compatible.length === 0) {
        console.log('\n' + chalk.yellow('No compatible models found.'));
        return;
    }

    console.log('\n' + chalk.green.bold(' ✅ Compatible Models (Score ≥ 75)'));

    const data = [
        [
            chalk.bgGreen.white.bold(' Model '),
            chalk.bgGreen.white.bold(' Size '),
            chalk.bgGreen.white.bold(' Score '),
            chalk.bgGreen.white.bold(' RAM '),
            chalk.bgGreen.white.bold(' VRAM '),
            chalk.bgGreen.white.bold(' Speed '),
            chalk.bgGreen.white.bold(' Status ')
        ]
    ];

    compatible.slice(0, 15).forEach(model => {
        const tokensPerSec = model.performanceEstimate?.estimatedTokensPerSecond || 'N/A';
        const ramReq = model.requirements?.ram || 1;
        const vramReq = model.requirements?.vram || 0;
        const speedFormatted = formatSpeed(model.performance?.speed || 'medium');
        const scoreColor = getScoreColor(model.score || 0);
        const scoreDisplay = scoreColor(`${model.score || 0}/100`);

        let statusDisplay = `${tokensPerSec}t/s`;
        if (model.isOllamaInstalled) {
            const ollamaInfo = model.ollamaInfo || {};
            if (ollamaInfo.isRunning) {
                statusDisplay = '🚀 Running';
            } else {
                statusDisplay = '📦 Installed';
            }
        }

        let modelName = model.name;
        if (model.isOllamaInstalled) {
            modelName = `${model.name} 🦙`;
        }

        const row = [
            modelName,
            formatSize(model.size || 'Unknown'),
            scoreDisplay,
            `${ramReq}GB`,
            `${vramReq}GB`,
            speedFormatted,
            statusDisplay
        ];
        data.push(row);
    });

    console.log(table(data));

    if (compatible.length > 15) {
        console.log(chalk.gray(`\n... and ${compatible.length - 15} more compatible models`));
    }

    displayCompatibleModelsSummary(compatible.length);
}

function displayCompatibleModelsSummary(count) {
    console.log('\n' + chalk.bgMagenta.white.bold(' COMPATIBLE MODELS '));
    console.log(chalk.hex('#a259ff')('╭' + '─'.repeat(40)));
    console.log(chalk.hex('#a259ff')('│') + ` Total compatible models: ${chalk.green.bold(count)}`);
    console.log(chalk.hex('#a259ff')('╰'));
}

function displayMarginalModels(marginal) {
    if (marginal.length === 0) return;

    console.log('\n' + chalk.yellow.bold('⚠️  Marginal Performance (Score 60-74)'));

    const data = [
        [
            chalk.bgYellow.white.bold(' Model '),
            chalk.bgYellow.white.bold(' Size '),
            chalk.bgYellow.white.bold(' Score '),
            chalk.bgYellow.white.bold(' RAM '),
            chalk.bgYellow.white.bold(' VRAM '),
            chalk.bgYellow.white.bold(' Issue ')
        ]
    ];

    marginal.slice(0, 6).forEach(model => {
        const mainIssue = model.issues?.[0] || 'Performance limitations';
        const scoreColor = getScoreColor(model.score || 0);
        const scoreDisplay = scoreColor(`${model.score || 0}/100`);

        const ramReq = model.requirements?.ram || 1;
        const vramReq = model.requirements?.vram || 0;

        const truncatedIssue = mainIssue.length > 30 ? mainIssue.substring(0, 27) + '...' : mainIssue;

        const row = [
            model.name,
            formatSize(model.size || 'Unknown'),
            scoreDisplay,
            `${ramReq}GB`,
            `${vramReq}GB`,
            truncatedIssue
        ];
        data.push(row);
    });

    console.log(table(data));

    if (marginal.length > 6) {
        console.log(chalk.gray(`\n... and ${marginal.length - 6} more marginal models`));
    }
}


function displayStructuredRecommendations(recommendations) {
    if (!recommendations) return;

    if (Array.isArray(recommendations)) {
        displayLegacyRecommendations(recommendations);
        return;
    }

    console.log('\n' + chalk.bgCyan.white.bold(' 🎯 SMART RECOMMENDATIONS '));
    console.log(chalk.cyan('╭' + '─'.repeat(50)));

    if (recommendations.general && recommendations.general.length > 0) {
        console.log(chalk.cyan('│') + ` ${chalk.bold.white('💡 General Recommendations:')}`);
        recommendations.general.slice(0, 4).forEach((rec, index) => {
            console.log(chalk.cyan('│') + `   ${index + 1}. ${chalk.white(rec)}`);
        });
        console.log(chalk.cyan('│'));
    }

    if (recommendations.installedModels && recommendations.installedModels.length > 0) {
        console.log(chalk.cyan('│') + ` ${chalk.bold.green('📦 Your Installed Ollama Models:')}`);
        recommendations.installedModels.forEach(rec => {
            console.log(chalk.cyan('│') + `   ${chalk.green(rec)}`);
        });
        console.log(chalk.cyan('│'));
    }

    if (recommendations.cloudSuggestions && recommendations.cloudSuggestions.length > 0) {
        console.log(chalk.cyan('│') + ` ${chalk.bold.blue('☁️ Recommended from Ollama Cloud:')}`);
        recommendations.cloudSuggestions.forEach(rec => {
            if (rec.includes('ollama pull')) {
                console.log(chalk.cyan('│') + `   🚀 ${chalk.cyan.bold(rec)}`);
            } else {
                console.log(chalk.cyan('│') + `   ${chalk.blue(rec)}`);
            }
        });
        console.log(chalk.cyan('│'));
    }

    if (recommendations.quickCommands && recommendations.quickCommands.length > 0) {
        console.log(chalk.cyan('│') + ` ${chalk.bold.yellow('⚡ Quick Commands:')}`);
        const uniqueCommands = [...new Set(recommendations.quickCommands)];
        uniqueCommands.slice(0, 3).forEach(cmd => {
            console.log(chalk.cyan('│') + `   > ${chalk.yellow.bold(cmd)}`);
        });
    }

    console.log(chalk.cyan('╰'));
}

function displayLegacyRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) return;

    const generalRecs = [];
    const ollamaFoundRecs = [];
    const quickInstallRecs = [];

    recommendations.forEach(rec => {
        if (rec.includes('📦') && rec.includes('Score:')) {
            ollamaFoundRecs.push(rec);
        } else if (rec.includes('ollama pull')) {
            quickInstallRecs.push(rec);
        } else if (rec.includes('ollama run')) {
            quickInstallRecs.push(rec);
        } else {
            generalRecs.push(rec);
        }
    });

    console.log('\n' + chalk.bgCyan.white.bold(' SMART RECOMMENDATIONS '));
    console.log(chalk.cyan('╭' + '─'.repeat(40)));

    generalRecs.slice(0, 8).forEach((rec, index) => {
        const number = chalk.green.bold(`${index + 1}.`);
        console.log(chalk.cyan('│') + ` ${number} ${chalk.white(rec)}`);
    });

    if (ollamaFoundRecs.length > 0) {
        console.log(chalk.cyan('│'));
        console.log(chalk.cyan('│') + ` ${chalk.bold.green('📦 Your Installed Ollama Models:')}`);
        ollamaFoundRecs.forEach(rec => {
            console.log(chalk.cyan('│') + `   ${chalk.green(rec)}`);
        });
    }

    if (quickInstallRecs.length > 0) {
        console.log(chalk.cyan('│'));
        console.log(chalk.cyan('│') + ` ${chalk.bold.blue('🚀 Quick Commands:')}`);
        quickInstallRecs.slice(0, 3).forEach(cmd => {
            console.log(chalk.cyan('│') + `   > ${chalk.cyan.bold(cmd)}`);
        });
    }

    console.log(chalk.cyan('╰'));
}

function displayIntelligentRecommendations(intelligentData) {
    if (!intelligentData || !intelligentData.summary) return;

    const { summary, recommendations } = intelligentData;
    const tier = summary.hardware_tier.replace('_', ' ').toUpperCase();
    const tierColor = tier.includes('HIGH') ? chalk.green : tier.includes('MEDIUM') ? chalk.yellow : chalk.red;

    console.log('\n' + chalk.bgRed.white.bold(' 🧠 INTELLIGENT RECOMMENDATIONS BY CATEGORY '));
    console.log(chalk.red('╭' + '─'.repeat(65)));
    console.log(chalk.red('│') + ` 🏆 Hardware Tier: ${tierColor.bold(tier)} | Models Analyzed: ${chalk.cyan.bold(intelligentData.totalModelsAnalyzed)}`);
    console.log(chalk.red('│'));

    // Mostrar mejor modelo general
    if (summary.best_overall) {
        const best = summary.best_overall;
        console.log(chalk.red('│') + ` 🌟 ${chalk.bold.yellow('BEST OVERALL:')} ${chalk.green.bold(best.name)}`);
        console.log(chalk.red('│') + `    📦 Command: ${chalk.cyan.bold(best.command)}`);
        console.log(chalk.red('│') + `    📊 Score: ${chalk.yellow.bold(best.score)}/100 | Category: ${chalk.magenta(best.category)}`);
        console.log(chalk.red('│'));
    }

    // Mostrar por categorías
    const categories = {
        coding: '💻',
        talking: '💬', 
        reading: '📚',
        reasoning: '🧮',
        multimodal: '🖼️',
        creative: '🎨',
        general: '🤖'
    };

    Object.entries(summary.by_category).forEach(([category, model]) => {
        const icon = categories[category] || '📋';
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        const scoreColor = getScoreColor(model.score);
        
        console.log(chalk.red('│') + ` ${icon} ${chalk.bold.white(categoryName)}:`);
        console.log(chalk.red('│') + `    🏆 ${chalk.green(model.name)} (${model.size})`);
        console.log(chalk.red('│') + `    📊 Score: ${scoreColor.bold(model.score)}/100 | Pulls: ${chalk.gray(model.pulls?.toLocaleString() || 'N/A')}`);
        console.log(chalk.red('│') + `    📦 ${chalk.cyan.bold(model.command)}`);
        console.log(chalk.red('│'));
    });

    console.log(chalk.red('╰'));
}

function displayModelsStats(originalCount, filteredCount, options) {
    console.log('\n' + chalk.bgGreen.white.bold(' 📊 DATABASE STATS '));
    console.log(chalk.green('╭' + '─'.repeat(60)));
    console.log(chalk.green('│') + ` Total models in database: ${chalk.cyan.bold(originalCount)}`);
    console.log(chalk.green('│') + ` After filters: ${chalk.yellow.bold(filteredCount)}`);
    
    if (options.category) {
        console.log(chalk.green('│') + ` Category filter: ${chalk.magenta.bold(options.category)}`);
    }
    if (options.size) {
        console.log(chalk.green('│') + ` Size filter: ${chalk.magenta.bold(options.size)}`);
    }
    if (options.popular) {
        console.log(chalk.green('│') + ` Filter: ${chalk.magenta.bold('Popular models only (>100k pulls)')}`);
    }
    if (options.recent) {
        console.log(chalk.green('│') + ` Filter: ${chalk.magenta.bold('Recent models only')}`);
    }
    
    console.log(chalk.green('╰'));
}

async function displayTopRecommended(models, categoryFilter) {
    console.log('\n' + chalk.bgGreen.white.bold(' 🏆 TOP 3 RECOMMENDED FOR YOUR HARDWARE '));
    
    try {
        // Usar la heurística matemática inteligente
        const hardwareDetector = new (require('../src/hardware/detector.js'))();
        const hardware = await hardwareDetector.getSystemInfo();
        
        const IntelligentModelRecommender = require('../src/models/intelligent-recommender.js');
        const recommender = new IntelligentModelRecommender();
        
        // Filtrar modelos por la categoría específica usando el mismo criterio
        const categoryModels = recommender.filterModelsByCategory(models, categoryFilter);
        
        // Aplicar scoring matemático inteligente
        const scoredModels = recommender.scoreModelsForCategory(categoryModels, categoryFilter, hardware);
        
        // Ordenar por score de categoría
        const sortedModels = scoredModels.sort((a, b) => b.categoryScore - a.categoryScore);
        
        // Expandir a variantes y calcular score individual para cada variante
        const allVariants = [];
        sortedModels.forEach(model => {
            if (model.tags && model.tags.length > 0) {
                model.tags.forEach(tag => {
                    const tagSize = extractSizeFromIdentifier(tag) || 
                                   model.main_size || 
                                   (model.model_sizes && model.model_sizes[0]) || 
                                   'Unknown';
                    
                    // Crear un modelo temporal para esta variante específica
                    const variantModel = {
                        ...model,
                        model_identifier: tag,
                        tags: [tag]
                    };
                    
                    // Calcular score específico para esta variante
                    const variantScored = recommender.scoreModelsForCategory([variantModel], categoryFilter, hardware)[0];
                    
                    allVariants.push({
                        name: tag,
                        size: tagSize,
                        score: Math.round(variantScored.categoryScore),
                        category: model.category || 'general',
                        context: model.context_length || 'Unknown',
                        input: (model.input_types && model.input_types.length > 0) ? 
                               model.input_types.slice(0, 2).join(',') : 'text',
                        reasoning: `Hardware: ${Math.round(variantScored.hardwareScore || 0)}/100, Specialization: ${Math.round(variantScored.specializationScore || 0)}/100, Popularity: ${Math.round(variantScored.popularityScore || 0)}/100`
                    });
                });
            } else {
                allVariants.push({
                    name: model.model_name || model.model_identifier,
                    size: model.main_size || 'Unknown',
                    score: Math.round(model.categoryScore),
                    category: model.category || 'general',
                    context: model.context_length || 'Unknown',
                    input: (model.input_types && model.input_types.length > 0) ? 
                           model.input_types.slice(0, 2).join(',') : 'text',
                    reasoning: `Hardware: ${Math.round(model.hardwareScore || 0)}/100, Specialization: ${Math.round(model.specializationScore || 0)}/100, Popularity: ${Math.round(model.popularityScore || 0)}/100`
                });
            }
        });
        
        // Ordenar variantes por score individual y tomar los top 3
        const sortedVariants = allVariants.sort((a, b) => b.score - a.score);
        const top3 = sortedVariants.slice(0, 3);
        
        if (top3.length === 0) {
            console.log(chalk.green('│') + chalk.yellow(' No models found for this category with current hardware'));
            console.log(chalk.green('╰' + '─'.repeat(65)));
            return;
        }
    
        top3.forEach((variant, index) => {
            const rankEmoji = ['🥇', '🥈', '🥉'][index];
            const categoryColor = getCategoryColor(variant.category);
            const scoreColor = variant.score >= 80 ? chalk.green.bold : 
                              variant.score >= 60 ? chalk.yellow : chalk.red;
            
            console.log(chalk.green('│'));
            console.log(chalk.green('│') + ` ${rankEmoji} ${chalk.cyan.bold(variant.name)}`);
            console.log(chalk.green('│') + `    📏 Size: ${chalk.green(variant.size)} | 📊 Score: ${scoreColor(variant.score + '%')} | 🏷️ ${categoryColor(variant.category)}`);
            console.log(chalk.green('│') + `    📦 Command: ${chalk.yellow.bold('ollama pull ' + variant.name)}`);
            console.log(chalk.green('│') + `    💡 ${chalk.gray(variant.reasoning)}`);
        });
        
        console.log(chalk.green('╰' + '─'.repeat(65)));
        
    } catch (error) {
        console.log(chalk.green('│') + chalk.red(' Error calculating intelligent recommendations: ' + error.message));
        console.log(chalk.green('╰' + '─'.repeat(65)));
    }
}

async function displayCompactModelsList(models, categoryFilter = null) {
    // Si hay modelos con compatibilityScore, mostrar top 3 recomendados primero
    const showCompatibility = models.length > 0 && models[0].compatibilityScore !== undefined;
    
    if (showCompatibility && categoryFilter) {
        await displayTopRecommended(models, categoryFilter);
    }
    
    console.log('\n' + chalk.bgBlue.white.bold(' 📋 MODELS LIST '));
    
    const headers = [
        chalk.bgBlue.white.bold(' # '),
        chalk.bgBlue.white.bold(' Model '),
        chalk.bgBlue.white.bold(' Size ')
    ];
    
    if (showCompatibility) {
        headers.push(chalk.bgBlue.white.bold(' Score '));
    }
    
    headers.push(
        chalk.bgBlue.white.bold(' Context '),
        chalk.bgBlue.white.bold(' Input '),
        chalk.bgBlue.white.bold(' Category ')
    );
    
    const data = [headers];

    let rowIndex = 0;
    models.forEach((model) => {
        const category = model.category || 'general';
        const categoryColor = getCategoryColor(category);
        
        // Context length
        const contextLength = model.context_length || 'Unknown';
        
        // Input types
        const inputTypes = (model.input_types && model.input_types.length > 0) ? 
            model.input_types.slice(0, 2).join(',') : 'text';
        
        // Si el modelo tiene tags/variantes, crear una fila por cada tag
        if (model.tags && model.tags.length > 0) {
            model.tags.forEach((tag) => {
                rowIndex++;
                
                // Extraer el tamaño del tag si está presente
                const tagSize = extractSizeFromIdentifier(tag) || 
                               model.main_size || 
                               (model.model_sizes && model.model_sizes[0]) || 
                               'Unknown';
                
                const row = [
                    chalk.gray(`${rowIndex}`),
                    tag, // Mostrar el tag completo como nombre del modelo
                    chalk.green(tagSize)
                ];
                
                // Agregar score si está disponible
                if (showCompatibility) {
                    const score = model.compatibilityScore || 0;
                    const scoreColor = score >= 80 ? chalk.green.bold : 
                                    score >= 60 ? chalk.yellow : chalk.red;
                    row.push(scoreColor(`${score}%`));
                }
                
                row.push(
                    chalk.blue(contextLength),
                    chalk.magenta(inputTypes),
                    categoryColor(category)
                );
                
                data.push(row);
            });
        } else {
            // Si no tiene tags, mostrar el modelo base
            rowIndex++;
            
            const mainSize = model.main_size || 
                            (model.model_sizes && model.model_sizes[0]) || 
                            extractSizeFromIdentifier(model.model_identifier) || 
                            'Unknown';
            
            const row = [
                chalk.gray(`${rowIndex}`),
                model.model_name || model.model_identifier || 'Unknown',
                chalk.green(mainSize)
            ];
            
            // Agregar score si está disponible
            if (showCompatibility) {
                const score = model.compatibilityScore || 0;
                const scoreColor = score >= 80 ? chalk.green.bold : 
                                score >= 60 ? chalk.yellow : chalk.red;
                row.push(scoreColor(`${score}%`));
            }
            
            row.push(
                chalk.blue(contextLength),
                chalk.magenta(inputTypes),
                categoryColor(category)
            );
            
            data.push(row);
        }
    });

    console.log(table(data));
}

function extractSizeFromIdentifier(identifier) {
    const sizeMatch = identifier.match(/(\d+\.?\d*[bg])/i);
    return sizeMatch ? sizeMatch[1].toLowerCase() : null;
}

function displayFullModelsList(models) {
    console.log('\n' + chalk.bgBlue.white.bold(' 📋 DETAILED MODELS LIST '));
    
    models.forEach((model, index) => {
        console.log(`\n${chalk.cyan.bold(`${index + 1}. ${model.model_name}`)}`);
        console.log(`   ${chalk.gray('Identifier:')} ${chalk.yellow(model.model_identifier)}`);
        console.log(`   ${chalk.gray('Size:')} ${chalk.green(model.main_size || 'Unknown')}`);
        console.log(`   ${chalk.gray('Context:')} ${chalk.blue(model.context_length || 'Unknown')}`);
        console.log(`   ${chalk.gray('Input types:')} ${chalk.magenta((model.input_types || ['text']).join(', '))}`);
        console.log(`   ${chalk.gray('Category:')} ${getCategoryColor(model.category || 'general')(model.category || 'general')}`);
        console.log(`   ${chalk.gray('Pulls:')} ${chalk.green((model.pulls || 0).toLocaleString())}`);
        console.log(`   ${chalk.gray('Description:')} ${model.description || model.detailed_description || 'No description'}`);
        
        if (model.use_cases && model.use_cases.length > 0) {
            console.log(`   ${chalk.gray('Use cases:')} ${model.use_cases.map(uc => chalk.magenta(uc)).join(', ')}`);
        }
        
        if (model.tags && model.tags.length > 0) {
            console.log(`   ${chalk.gray(`Available variants (${model.tags.length}):`)} `);
            // Mostrar las primeras 10 variantes, agrupadas de 5 por línea
            const tagsToShow = model.tags.slice(0, 15);
            for (let i = 0; i < tagsToShow.length; i += 5) {
                const batch = tagsToShow.slice(i, i + 5);
                console.log(`     ${batch.map(tag => chalk.blue(tag)).join(', ')}`);
            }
            if (model.tags.length > 15) {
                console.log(`     ${chalk.gray(`... and ${model.tags.length - 15} more variants`)}`);
            }
        }
        
        if (model.quantizations && model.quantizations.length > 0) {
            console.log(`   ${chalk.gray('Quantizations found:')} ${model.quantizations.map(q => chalk.green(q)).join(', ')}`);
        }
        
        console.log(`   ${chalk.gray('Base command:')} ${chalk.cyan.bold(`ollama pull ${model.model_identifier}`)}`);
        console.log(`   ${chalk.gray('Example variant:')} ${chalk.cyan.bold(`ollama pull ${model.tags && model.tags.length > 0 ? model.tags[0] : model.model_identifier}`)}`);
        console.log(`   ${chalk.gray('Updated:')} ${model.last_updated || 'Unknown'}`);
    });
}

function getCategoryColor(category) {
    const colors = {
        coding: chalk.blue,
        talking: chalk.green,
        reading: chalk.yellow,
        reasoning: chalk.red,
        multimodal: chalk.magenta,
        creative: chalk.cyan,
        general: chalk.gray,
        chat: chalk.green,
        embeddings: chalk.blue
    };
    
    return colors[category] || chalk.gray;
}

function displaySampleCommands(topModels) {
    console.log('\n' + chalk.bgYellow.black.bold(' ⚡ SAMPLE COMMANDS '));
    console.log(chalk.yellow('╭' + '─'.repeat(60)));
    console.log(chalk.yellow('│') + ` ${chalk.bold.white('Try these popular models:')}`);
    
    topModels.forEach((model, index) => {
        const command = `ollama pull ${model.model_identifier}`;
        console.log(chalk.yellow('│') + `   ${index + 1}. ${chalk.cyan.bold(command)}`);
    });
    
    console.log(chalk.yellow('│'));
    console.log(chalk.yellow('│') + ` ${chalk.bold.white('Browse models by category:')}`);
    console.log(chalk.yellow('│') + `   💻 ${chalk.cyan('llm-checker list-models --category coding')} ${chalk.gray('(Programming & development)')}`);
    console.log(chalk.yellow('│') + `   🧮 ${chalk.cyan('llm-checker list-models --category reasoning')} ${chalk.gray('(Logic & math problems)')}`);
    console.log(chalk.yellow('│') + `   💬 ${chalk.cyan('llm-checker list-models --category talking')} ${chalk.gray('(Chat & conversations)')}`);
    console.log(chalk.yellow('│') + `   📚 ${chalk.cyan('llm-checker list-models --category reading')} ${chalk.gray('(Text analysis & comprehension)')}`);
    console.log(chalk.yellow('│') + `   🖼️  ${chalk.cyan('llm-checker list-models --category multimodal')} ${chalk.gray('(Image & vision tasks)')}`);
    console.log(chalk.yellow('│') + `   🎨 ${chalk.cyan('llm-checker list-models --category creative')} ${chalk.gray('(Creative writing & stories)')}`);
    console.log(chalk.yellow('│') + `   🤖 ${chalk.cyan('llm-checker list-models --category general')} ${chalk.gray('(General purpose tasks)')}`);
    console.log(chalk.yellow('│'));
    console.log(chalk.yellow('│') + ` ${chalk.bold.white('AI-powered selection:')}`);
    console.log(chalk.yellow('│') + `   🧠 ${chalk.cyan('llm-checker ai-check --category coding --top 12')} ${chalk.gray('(AI meta-evaluation)')}`);
    console.log(chalk.yellow('│') + `   🚀 ${chalk.cyan('llm-checker ai-run')} ${chalk.gray('(Smart model selection & launch)')}`);
    console.log(chalk.yellow('│'));
    console.log(chalk.yellow('│') + ` ${chalk.bold.white('Additional options:')}`);
    console.log(chalk.yellow('│') + `   📊 ${chalk.gray('llm-checker list-models --popular --limit 10')}`);
    console.log(chalk.yellow('│') + `   💾 ${chalk.gray('llm-checker list-models --json > models.json')}`);
    console.log(chalk.yellow('╰'));
}

function displayNextSteps(analysis) {
    const stepsRaw = [];

    if (!analysis.ollamaInfo.available) {
        stepsRaw.push(['🦙', chalk.white(`Install Ollama:`) + ' ' + chalk.underline('https://ollama.ai')]);
        stepsRaw.push(['📚', `Return here to see compatible models`]);
    } else if (!analysis.ollamaModels || analysis.ollamaModels.length === 0) {
        stepsRaw.push(['🚀', `Install a recommended model from above`]);
        stepsRaw.push(['💬', chalk.yellow(`Start chatting: ollama run <model-name>`)]);
    } else {
        stepsRaw.push(['📊', chalk.yellow(`Analyze: llm-checker analyze-model <model>`)]);
        stepsRaw.push(['🔍', chalk.yellow(`See status: llm-checker ollama --list`)]);
        stepsRaw.push(['🚀', chalk.yellow(`Try: ollama run <your-best-model>`)]);
    }

    console.log('\n' + chalk.bgMagenta.white.bold(' 🎯 NEXT STEPS ') + '\n' + chalk.hex('#a259ff')('╭' + '─'.repeat(40)));

    stepsRaw.forEach(([icon, text], index) => {
        const num = chalk.green.bold(`${index + 1}.`);
        console.log(chalk.hex('#a259ff')('│') + ` ${num} ${icon} ${text}`);
    });

    console.log(chalk.hex('#a259ff')('╰'));
}

program
    .command('check')
    .description('Analyze your system and show compatible LLM models')
    .option('-d, --detailed', 'Show detailed hardware information')
    .option('-f, --filter <type>', 'Filter by model type')
    .option('-u, --use-case <case>', 'Specify use case', 'general')
    .option('--include-cloud', 'Include cloud models in analysis')
    .option('--ollama-only', 'Only show models available in Ollama')
    .option('--performance-test', 'Run performance benchmarks')
    .option('--show-ollama-analysis', 'Show detailed Ollama model analysis')
    .action(async (options) => {
        const spinner = ora('🔍 Analyzing your system...').start();

        try {
            const checker = new LLMChecker();

            spinner.text = '🖥️  Detecting hardware...';
            const hardware = await checker.getSystemInfo();

            spinner.text = '🦙 Integrating with Ollama...';
            const analysis = await checker.analyze({
                filter: options.filter,
                useCase: options.useCase,
                includeCloud: options.includeCloud,
                performanceTest: options.performanceTest
            });

            spinner.succeed('✅ Analysis complete!');

            displaySystemInfo(hardware, analysis);
            displayOllamaIntegration(analysis.ollamaInfo, analysis.ollamaModels);
            displayEnhancedCompatibleModels(analysis.compatible, analysis.ollamaModels);

            if (analysis.marginal.length > 0) {
                displayMarginalModels(analysis.marginal);
            }

            displayStructuredRecommendations(analysis.recommendations);
            
            // Mostrar recomendaciones inteligentes por categoría
            if (analysis.intelligentRecommendations) {
                displayIntelligentRecommendations(analysis.intelligentRecommendations);
            }
            
            displayNextSteps(analysis);

        } catch (error) {
            spinner.fail('Failed to analyze system');
            console.error(chalk.red('Error:'), error.message);
            if (process.env.DEBUG) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    });

program
    .command('ollama')
    .description('Manage Ollama integration with hardware compatibility')
    .option('-l, --list', 'List installed models with compatibility scores')
    .option('-r, --running', 'Show running models with performance data')
    .option('-c, --compatible', 'Show only hardware-compatible installed models')
    .option('--recommendations', 'Show installation recommendations')
    .action(async (options) => {
        const spinner = ora('Checking Ollama integration...').start();

        try {
            const checker = new LLMChecker();
            const analysis = await checker.analyze();

            if (!analysis.ollamaInfo.available) {
                spinner.fail(`Ollama not available`);
                console.log('\n💡 To install Ollama:');
                console.log('🔗 Visit: https://ollama.ai');
                return;
            }

            spinner.succeed(`Ollama integration active`);

            if (options.list) {
                console.log('Ollama models list feature coming soon...');
            }

        } catch (error) {
            spinner.fail('Error with Ollama integration');
            console.error(chalk.red('Error:'), error.message);
        }
    });

program
    .command('update-db')
    .description('Update Ollama models database')
    .option('-f, --force', 'Force update, ignore cache')
    .action(async (options) => {
        const spinner = ora('Updating Ollama models database...').start();

        try {
            const checker = new LLMChecker();
            
            if (options.force) {
                spinner.text = '🔄 Force updating database (this may take a while)...';
                const data = await checker.forceUpdateOllamaDatabase();
                spinner.succeed(`✅ Database force updated! Found ${data.total_count} models`);
            } else {
                spinner.text = '📡 Checking for database updates...';
                const data = await checker.updateOllamaDatabase();
                if (data) {
                    spinner.succeed(`✅ Database updated! Found ${data.total_count} models`);
                } else {
                    spinner.succeed('📋 Database is up to date');
                }
            }

            const stats = await checker.getOllamaModelStats();
            if (stats) {
                console.log('\n' + chalk.bgBlue.white.bold(' 📊 DATABASE STATS '));
                console.log(chalk.blue('╭' + '─'.repeat(40)));
                console.log(chalk.blue('│') + ` Total models: ${chalk.green.bold(stats.total_models || 'N/A')}`);
                console.log(chalk.blue('│') + ` Last updated: ${chalk.yellow(stats.last_updated || 'Unknown')}`);
                console.log(chalk.blue('╰'));
            }

        } catch (error) {
            spinner.fail('Failed to update database');
            console.error(chalk.red('Error:'), error.message);
            if (process.env.DEBUG) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    });

program
    .command('recommend')
    .description('Get intelligent model recommendations for your hardware')
    .option('-c, --category <category>', 'Get recommendations for specific category (coding, talking, reading, etc.)')
    .action(async (options) => {
        const spinner = ora('🧠 Analyzing your hardware and generating recommendations...').start();

        try {
            const checker = new LLMChecker();
            const hardware = await checker.getSystemInfo();
            
            spinner.text = '📊 Analyzing thousands of models...';
            const intelligentRecommendations = await checker.generateIntelligentRecommendations(hardware);

            if (!intelligentRecommendations) {
                spinner.fail('Failed to generate recommendations');
                return;
            }

            spinner.succeed('✅ Smart recommendations generated!');

            // Mostrar información del sistema
            displaySystemInfo(hardware, { summary: { hardwareTier: intelligentRecommendations.summary.hardware_tier } });
            
            // Mostrar recomendaciones
            displayIntelligentRecommendations(intelligentRecommendations);

        } catch (error) {
            spinner.fail('Failed to generate recommendations');
            console.error(chalk.red('Error:'), error.message);
            if (process.env.DEBUG) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    });

program
    .command('list-models')
    .description('List all models from Ollama database')
    .option('-c, --category <category>', 'Filter by category (coding, talking, reading, reasoning, multimodal, creative, general)')
    .option('-s, --size <size>', 'Filter by size (small, medium, large, e.g., "7b", "13b")')
    .option('-p, --popular', 'Show only popular models (>100k pulls)')
    .option('-r, --recent', 'Show only recent models (updated in last 30 days)')
    .option('--limit <number>', 'Limit number of results (default: 50)', '50')
    .option('--full', 'Show full details including variants and tags')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
        const spinner = ora('📋 Loading models database...').start();

        try {
            const checker = new LLMChecker();
            const data = await checker.ollamaScraper.scrapeAllModels(false);
            
            if (!data || !data.models) {
                spinner.fail('No models found in database');
                return;
            }

            let models = data.models;
            let originalCount = models.length;

            // Aplicar filtros
            if (options.category) {
                const categoryFilter = options.category.toLowerCase();
                models = models.filter(model => {
                    // Buscar en categoría principal
                    if (model.category === categoryFilter) return true;
                    
                    // Buscar en use_cases
                    if (model.use_cases && model.use_cases.includes(categoryFilter)) return true;
                    
                    // Buscar por palabras clave en el nombre/identificador
                    const modelText = `${model.model_name} ${model.model_identifier}`.toLowerCase();
                    
                    switch(categoryFilter) {
                        case 'coding':
                        case 'code':
                            return modelText.includes('code') || modelText.includes('coder') || 
                                   modelText.includes('programming') || modelText.includes('deepseek') ||
                                   modelText.includes('starcoder');
                        case 'talking':
                        case 'chat':
                            return modelText.includes('chat') || modelText.includes('llama') ||
                                   modelText.includes('mistral') || modelText.includes('gemma') ||
                                   modelText.includes('phi');
                        case 'reasoning':
                            return modelText.includes('reasoning') || modelText.includes('deepseek-r1') ||
                                   modelText.includes('qwq') || modelText.includes('r1');
                        case 'multimodal':
                        case 'vision':
                            return modelText.includes('vision') || modelText.includes('llava') ||
                                   modelText.includes('minicpm-v');
                        case 'creative':
                        case 'writing':
                            return modelText.includes('wizard') || modelText.includes('creative') ||
                                   modelText.includes('uncensored');
                        case 'embeddings':
                        case 'embed':
                            return modelText.includes('embed') || modelText.includes('bge') ||
                                   modelText.includes('nomic');
                        default:
                            return false;
                    }
                });
            }

            if (options.size) {
                const sizeFilter = options.size.toLowerCase();
                models = models.filter(model => 
                    model.model_identifier.toLowerCase().includes(sizeFilter) ||
                    (model.model_sizes && model.model_sizes.some(size => size.includes(sizeFilter)))
                );
            }

            if (options.popular) {
                models = models.filter(model => (model.pulls || 0) > 100000);
            }

            if (options.recent) {
                models = models.filter(model => 
                    model.last_updated && model.last_updated.includes('day')
                );
            }

            // Si hay filtro de categoría, ordenar por compatibilidad con hardware
            if (options.category) {
                try {
                    const LLMChecker = require('../src/index.js');
                    const hardwareDetector = new (require('../src/hardware/detector.js'))();
                    const hardware = await hardwareDetector.getSystemInfo();
                    
                    // Calcular puntuación de compatibilidad para cada modelo
                    models = models.map(model => {
                        const compatibilityScore = calculateModelCompatibilityScore(model, hardware);
                        return { ...model, compatibilityScore };
                    });
                    
                    // Ordenar por compatibilidad primero, luego por popularidad
                    models.sort((a, b) => {
                        if (b.compatibilityScore !== a.compatibilityScore) {
                            return b.compatibilityScore - a.compatibilityScore;
                        }
                        return (b.pulls || 0) - (a.pulls || 0);
                    });
                    
                    spinner.text = `🧠 Sorted by hardware compatibility (${getHardwareTierForDisplay(hardware)})`;
                } catch (error) {
                    console.warn('Could not sort by hardware compatibility:', error.message);
                    // Fallback a ordenar por popularidad
                    models.sort((a, b) => (b.pulls || 0) - (a.pulls || 0));
                }
            } else {
                // Sin filtro de categoría, ordenar solo por popularidad
                models.sort((a, b) => (b.pulls || 0) - (a.pulls || 0));
            }

            // Limitar resultados
            const limit = parseInt(options.limit) || 50;
            const displayModels = models.slice(0, limit);

            spinner.succeed(`✅ Found ${models.length} models (showing ${displayModels.length})`);

            if (options.json) {
                console.log(JSON.stringify(displayModels, null, 2));
                return;
            }

            // Mostrar estadísticas
            displayModelsStats(originalCount, models.length, options);
            
            // Mostrar modelos
            if (options.full) {
                displayFullModelsList(displayModels);
            } else {
                await displayCompactModelsList(displayModels, options.category);
            }

            // Mostrar comandos de ejemplo
            if (displayModels.length > 0) {
                displaySampleCommands(displayModels.slice(0, 3));
            }

        } catch (error) {
            spinner.fail('Failed to load models');
            console.error(chalk.red('Error:'), error.message);
            if (process.env.DEBUG) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    });


function getStatusColor(status) {
    const colors = {
        'TRAINED': chalk.green,
        'NOT TRAINED': chalk.yellow,
        'CORRUPTED': chalk.red
    };
    return colors[status] || chalk.gray;
}

function getConfidenceColor(confidence) {
    if (confidence >= 0.8) return chalk.green.bold;
    if (confidence >= 0.6) return chalk.yellow.bold;
    if (confidence >= 0.4) return chalk.red.bold; // orange doesn't exist, use red
    return chalk.red.bold;
}

function getScoreColor(score) {
    if (score >= 85) return chalk.green.bold;
    if (score >= 70) return chalk.cyan.bold;
    if (score >= 55) return chalk.yellow.bold;
    if (score >= 40) return chalk.red.bold;
    return chalk.gray;
}

function getTierColor(tier) {
    const colors = {
        'extreme': chalk.magenta.bold,
        'very_high': chalk.green.bold,
        'high': chalk.cyan.bold,
        'medium': chalk.yellow,
        'low': chalk.red,
        'ultra_low': chalk.gray
    };
    return colors[tier] || chalk.white;
}

program
    .command('ai-check')
    .description('AI-powered model evaluation with meta-analysis')
    .option('-c, --category <category>', 'Category: coding, reasoning, multimodal, general', 'general')
    .option('-t, --top <number>', 'Number of top models to show', '12')
    .option('--ctx <number>', 'Target context length', '8192')
    .option('-e, --evaluator <model>', 'Evaluator model (auto for best available)', 'auto')
    .option('-w, --weight <number>', 'AI weight (0.0-1.0, default 0.3)', '0.3')
    .action(async (options) => {
        // Check if Ollama is installed first
        await checkOllamaAndExit();
        
        const AICheckSelector = require('../src/models/ai-check-selector');
        
        try {
            const spinner = ora('🧠 AI-Check Mode: Meta-evaluation in progress...').start();
            
            const aiCheckSelector = new AICheckSelector();
            
            const checkOptions = {
                category: options.category,
                top: parseInt(options.top),
                ctx: options.ctx ? parseInt(options.ctx) : undefined,
                evaluator: options.evaluator,
                weight: parseFloat(options.weight)
            };
            
            spinner.stop();
            
            const result = await aiCheckSelector.aiCheck(checkOptions);
            
            // Format and display results
            aiCheckSelector.formatResults(result);
            
        } catch (error) {
            console.error(chalk.red('❌ AI-Check failed:'), error.message);
            if (process.argv.includes('--verbose')) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    });

program
    .command('ai-run')
    .description('AI-powered model selection and execution')
    .option('-m, --models <models...>', 'Specific models to choose from')
    .option('--prompt <prompt>', 'Prompt to run with selected model')
    .action(async (options) => {
        // Check if Ollama is installed first
        await checkOllamaAndExit();
        
        const AIModelSelector = require('../src/ai/model-selector');
        
        try {
            const spinner = ora('🧠 Selecting best model and launching...').start();
            
            const aiSelector = new AIModelSelector();
            const checker = new LLMChecker();
            const systemInfo = await checker.getSystemInfo();
            
            // Get available models or use provided ones
            let candidateModels = options.models;
            
            if (!candidateModels) {
                spinner.text = '📋 Getting available Ollama models...';
                const OllamaClient = require('../src/ollama/client');
                const client = new OllamaClient();
                
                try {
                    const models = await client.getLocalModels();
                    candidateModels = models.map(m => m.name || m.model);
                    
                    if (candidateModels.length === 0) {
                        spinner.fail('❌ No Ollama models found');
                        console.log('\nInstall some models first:');
                        console.log('  ollama pull llama2:7b');
                        console.log('  ollama pull mistral:7b');
                        console.log('  ollama pull phi3:mini');
                        return;
                    }
                } catch (error) {
                    spinner.fail('❌ Failed to get Ollama models');
                    console.error(chalk.red('Error:'), error.message);
                    return;
                }
            }
            
            // AI selection
            const systemSpecs = {
                cpu_cores: systemInfo.cpu?.cores || 4,
                cpu_freq_max: systemInfo.cpu?.speed || 3.0,
                total_ram_gb: systemInfo.memory?.total || 8,
                gpu_vram_gb: systemInfo.gpu?.vram || 0,
                gpu_model_normalized: systemInfo.gpu?.model || 
                    (systemInfo.cpu?.manufacturer === 'Apple' ? 'apple_silicon' : 'cpu_only')
            };
            
            const result = await aiSelector.selectBestModel(candidateModels, systemSpecs);
            
            spinner.succeed(`✅ Selected ${chalk.green.bold(result.bestModel)} (${result.method}, ${Math.round(result.confidence * 100)}% confidence)`);
            
            // Execute the selected model
            console.log(chalk.magenta.bold(`\n🚀 Launching ${result.bestModel}...`));
            console.log(chalk.gray(`💡 Tip: Type ${chalk.cyan('/bye')} to exit the chat when finished\n`));
            
            const args = ['run', result.bestModel];
            if (options.prompt) {
                args.push(options.prompt);
            }
            
            const ollamaProcess = spawn('ollama', args, { 
                stdio: 'inherit'
            });
            
            ollamaProcess.on('error', (error) => {
                console.error(chalk.red('Failed to launch Ollama:'), error.message);
            });
            
        } catch (error) {
            console.error(chalk.red('❌ AI-powered execution failed:'), error.message);
            process.exit(1);
        }
    });

program.parse();
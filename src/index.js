const HardwareDetector = require('./hardware/detector');
const ExpandedModelsDatabase = require('./models/expanded_database');
const EnhancedModelSelector = require('./models/enhanced-selector');
const CompatibilityAnalyzer = require('../analyzer/compatibility');
const PerformanceAnalyzer = require('../analyzer/performance');
const OllamaClient = require('./ollama/client');
const { getLogger } = require('./utils/logger');
const { getOllamaModelsIntegration, OllamaNativeScraper } = require('./ollama/native-scraper');
const VerboseProgress = require('./utils/verbose-progress');

class LLMChecker {
    constructor(options = {}) {
        this.hardwareDetector = new HardwareDetector();
        this.expandedModelsDatabase = new ExpandedModelsDatabase();
        this.intelligentRecommender = new EnhancedModelSelector();
        this.ollamaScraper = new OllamaNativeScraper();
        this.compatibilityAnalyzer = new CompatibilityAnalyzer();
        this.performanceAnalyzer = new PerformanceAnalyzer();
        this.ollamaClient = new OllamaClient();
        this.logger = getLogger().createChild('LLMChecker');
        this.verbose = options.verbose !== false; // Default to verbose unless explicitly disabled
        this.progress = null; // Will be initialized when needed
    }

    async analyze(options = {}) {
        // Initialize verbose progress if enabled
        if (this.verbose && !this.progress) {
            this.progress = VerboseProgress.create(true);
        }

        try {
            if (this.progress) {
                this.progress.startOperation('LLM Model Analysis & Compatibility Check', 8);
            }

            // Step 1: Hardware Detection
            if (this.progress) {
                this.progress.step('System Detection', 'Scanning hardware specifications...');
            }
            
            const hardware = await this.hardwareDetector.getSystemInfo();
            this.logger.info('Hardware detected', { hardware });
            
            if (this.progress) {
                this.progress.substep(`CPU detected: ${hardware.cpu.brand} (${hardware.cpu.cores} cores)`);
                await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for demo
                this.progress.substep(`Memory detected: ${hardware.memory.total}GB unified memory`, true);
                const summary = `${hardware.cpu.brand}, ${hardware.memory.total}GB RAM, ${hardware.gpu.model || 'Integrated GPU'}`;
                this.progress.stepComplete(summary);
            }

            // Step 2: Database Sync (using static database)
            if (this.progress) {
                this.progress.step('Database Sync', 'Loading model database...');
            }
            
            // Using static pre-loaded model database with classifications
            const modelCount = 177; // Static count from pre-loaded database
            
            if (this.progress) {
                this.progress.found(`${modelCount} models in database`);
                this.progress.stepComplete('Database synchronized');
            }

            // Step 3: Load Base Models
            if (this.progress) {
                this.progress.step('Model Analysis', 'Loading base model definitions...');
            }
            
            let models = this.expandedModelsDatabase.getAllModels();
            
            if (this.progress) {
                this.progress.found(`Loaded ${models.length} base models`);
                this.progress.stepComplete('Base models loaded');
            }

            // Step 4: Ollama Integration
            if (this.progress) {
                this.progress.step('Ollama Integration', 'Connecting to Ollama and checking installed models...');
            }
            
            const ollamaIntegration = await this.integrateOllamaModels(hardware, models);
            
            if (this.progress) {
                if (ollamaIntegration.ollamaInfo.available) {
                    const installed = ollamaIntegration.compatibleOllamaModels.length;
                    this.progress.found(`Ollama connected with ${installed} compatible models`);
                } else {
                    this.progress.warn('Ollama not available - continuing with database analysis only');
                }
                this.progress.stepComplete('Ollama integration complete');
            }

            // Step 5: Filter Models (skip step if no filtering needed)
            if (options.filter || !options.includeCloud) {
                if (this.progress) {
                    this.progress.step('Model Filtering', 'Applying user-specified filters...');
                }

                const originalCount = models.length;
                if (options.filter) {
                    models = this.filterModels(models, options.filter);
                    if (this.progress) {
                        this.progress.substep(`Filter applied: ${options.filter}`);
                    }
                }

                if (!options.includeCloud) {
                    models = models.filter(model => model.type === 'local');
                    if (this.progress) {
                        this.progress.substep('Cloud models excluded', true);
                    }
                }
                
                if (this.progress) {
                    this.progress.stepComplete(`${models.length}/${originalCount} models selected`);
                }
            }

            // Step 6: Mathematical Analysis
            if (this.progress) {
                this.progress.step('Compatibility Analysis', 'Running mathematical heuristics and hardware matching...');
            }
            
            const compatibility = await this.analyzeWithMathematicalHeuristics(hardware, models, ollamaIntegration);
            
            if (this.progress) {
                const stats = `${compatibility.compatible.length} compatible, ${compatibility.marginal.length} marginal`;
                this.progress.stepComplete(stats);
            }

            // Step 7: Performance Estimation
            if (this.progress) {
                this.progress.step('Performance Analysis', 'Estimating model performance and speeds...');
            }
            
            const enrichedResults = await this.enrichWithPerformanceData(hardware, compatibility);
            
            if (this.progress) {
                const perfCount = Object.keys(enrichedResults.performanceEstimates || {}).length;
                this.progress.stepComplete(`Performance data for ${perfCount} models`);
            }

            // Step 8: Generating Recommendations
            if (this.progress) {
                this.progress.step('Smart Recommendations', 'Generating personalized model suggestions...');
            }
            
            const [recommendations, intelligentRecommendations] = await Promise.all([
                this.generateEnhancedRecommendations(
                    hardware,
                    enrichedResults,
                    ollamaIntegration,
                    options.useCase || 'general'
                ),
                this.generateIntelligentRecommendations(hardware)
            ]);
            
            if (this.progress) {
                const recCount = Object.values(recommendations).flat().length;
                this.progress.substep(`Analyzing use case: ${options.useCase || 'general'}`);
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for demo
                this.progress.substep('Generating Ollama commands...', true);
                this.progress.stepComplete(`${recCount} recommendations generated`);
                
                // Complete the entire operation
                const totalModels = enrichedResults.compatible.length + enrichedResults.marginal.length;
                this.progress.complete(`Found ${totalModels} compatible models for your hardware`);
            }

            return {
                hardware,
                compatible: enrichedResults.compatible,
                marginal: enrichedResults.marginal,
                incompatible: enrichedResults.incompatible,
                recommendations,
                intelligentRecommendations,
                ollamaInfo: ollamaIntegration.ollamaInfo,
                ollamaModels: ollamaIntegration.compatibleOllamaModels,
                summary: this.generateEnhancedSummary(hardware, enrichedResults, ollamaIntegration),
                performanceEstimates: enrichedResults.performanceEstimates
            };

        } catch (error) {
            if (this.progress) {
                this.progress.fail(`Analysis failed: ${error.message}`);
            }
            this.logger.error('Analysis failed', { error: error.message, component: 'LLMChecker', method: 'analyze' });
            throw new Error(`Analysis failed: ${error.message}`);
        }
    }

    async integrateOllamaModels(hardware, availableModels) {
        const integration = {
            ollamaInfo: { available: false },
            compatibleOllamaModels: [],
            recommendedPulls: [],
            currentlyRunning: []
        };

        try {
            const ollamaStatus = await this.ollamaClient.checkOllamaAvailability();
            integration.ollamaInfo = ollamaStatus;

            if (!ollamaStatus.available) {
                this.logger.warn('Ollama not available', { error: ollamaStatus.error });
                return integration;
            }

            const [localModels, runningModels] = await Promise.all([
                this.ollamaClient.getLocalModels().catch(() => []),
                this.ollamaClient.getRunningModels().catch(() => [])
            ]);

            integration.currentlyRunning = runningModels;

            try {
                this.logger.info('Using enhanced model database for compatibility...');

                const enhancedCompatibility = await getOllamaModelsIntegration(localModels);

                if (enhancedCompatibility.compatible_models && enhancedCompatibility.compatible_models.length > 0) {
                    for (const compatibleMatch of enhancedCompatibility.compatible_models) {
                        const ollamaModel = compatibleMatch.local;
                        const cloudModel = compatibleMatch.cloud;

                        let matchedModel = this.findMatchingModelInDatabase(cloudModel, availableModels);

                        if (!matchedModel) {
                            matchedModel = this.createModelFromCloudData(cloudModel);
                        }

                        const compatibility = this.compatibilityAnalyzer.calculateModelCompatibility(hardware, matchedModel);

                        let finalScore = compatibility.score;
                        if (compatibleMatch.match_type === 'exact') {
                            finalScore = Math.max(finalScore, 75);
                        } else {
                            finalScore = Math.max(finalScore, 65);
                        }

                        const enrichedOllamaModel = {
                            ...ollamaModel,
                            matchedModel,
                            compatibilityScore: finalScore,
                            issues: compatibility.issues || [],
                            notes: compatibility.notes || [],
                            isRunning: runningModels.some(r => r.name === ollamaModel.name),
                            canRun: finalScore >= 60,
                            performanceEstimate: await this.performanceAnalyzer.estimateModelPerformance(matchedModel, hardware),
                            cloudInfo: {
                                pulls: cloudModel.pulls,
                                url: cloudModel.url,
                                match_type: compatibleMatch.match_type,
                                model_type: cloudModel.model_type
                            }
                        };

                        integration.compatibleOllamaModels.push(enrichedOllamaModel);
                    }

                    this.logger.info('Enhanced Ollama integration completed', {
                        data: {
                            localModels: localModels.length,
                            compatibleModels: integration.compatibleOllamaModels.length,
                            runningModels: runningModels.length,
                            totalAvailable: enhancedCompatibility.all_available,
                            enhancedMatching: true
                        }
                    });
                } else {
                    this.logger.warn('No enhanced compatible models found, using fallback');
                    await this.processFallbackModels(localModels, runningModels, availableModels, hardware, integration);
                }

            } catch (enhancedError) {
                this.logger.warn('Enhanced matching failed, using fallback method', { error: enhancedError.message });
                await this.processFallbackModels(localModels, runningModels, availableModels, hardware, integration);
            }

            integration.recommendedPulls = await this.generateOllamaRecommendations(hardware, availableModels, localModels);

        } catch (error) {
            this.logger.error('Ollama integration failed', { error: error.message, component: 'LLMChecker', method: 'integrateOllamaModels' });
        }

        return integration;
    }

    async analyzeWithMathematicalHeuristics(hardware, staticModels, ollamaIntegration) {
        this.logger.info('Using mathematical heuristics combining database + local models');
        
        try {
            // 1. Obtener TODOS los modelos de la base de datos de Ollama
            const ollamaData = await this.ollamaScraper.scrapeAllModels(false);
            const allOllamaModels = ollamaData.models || [];
            this.logger.info(`Found ${allOllamaModels.length} models in Ollama database`);

            // 2. Crear una lista combinada de todos los modelos únicos
            const allModelsMap = new Map();
            
            // Agregar modelos estáticos
            staticModels.forEach(model => {
                allModelsMap.set(model.name, {
                    ...model,
                    source: 'static_database',
                    isOllamaInstalled: false
                });
            });
            
            // Agregar modelos de Ollama (con prioridad si ya existen)
            allOllamaModels.forEach(ollamaModel => {
                const modelKey = this.findBestMatchingKey(ollamaModel, allModelsMap);
                
                if (modelKey) {
                    // Mejorar modelo existente con datos de Ollama
                    const existing = allModelsMap.get(modelKey);
                    allModelsMap.set(modelKey, {
                        ...existing,
                        ...this.createEnhancedModelFromOllama(ollamaModel, existing),
                        source: 'enhanced_with_ollama'
                    });
                } else {
                    // Crear nuevo modelo desde datos de Ollama
                    const newModel = this.createModelFromOllamaData(ollamaModel);
                    allModelsMap.set(newModel.name, {
                        ...newModel,
                        source: 'ollama_database'
                    });
                }
            });
            
            const allUniqueModels = Array.from(allModelsMap.values());
            this.logger.info(`Combined total: ${allUniqueModels.length} unique models`);

            // 3. Usar el nuevo selector multi-objetivo
            const MultiObjectiveSelector = require('./ai/multi-objective-selector');
            const multiObjectiveSelector = new MultiObjectiveSelector();
            
            // Ejecutar análisis multi-objetivo
            const multiObjectiveResult = await multiObjectiveSelector.selectBestModels(
                hardware,
                allUniqueModels,
                'general',
                50 // Top 50 modelos
            );
            
            this.logger.info(`Multi-objective analysis completed: ${multiObjectiveResult.compatible.length} compatible, ${multiObjectiveResult.marginal.length} marginal`);

            // 4. Los resultados ya vienen clasificados del nuevo selector
            const compatibility = {
                compatible: multiObjectiveResult.compatible.map(model => ({
                    ...model,
                    score: model.totalScore,
                    confidence: model.totalScore / 100,
                    reasoning: model.reasoning,
                    mathAnalysis: {
                        qualityScore: model.components.quality,
                        speedScore: model.components.speed,
                        ttfbScore: model.components.ttfb,
                        contextScore: model.components.context,
                        hardwareMatchScore: model.components.hardwareMatch
                    },
                    isOllamaInstalled: this.checkIfModelInstalled(model, ollamaIntegration),
                    ollamaInfo: this.getOllamaModelInfo(model, ollamaIntegration)
                })),
                marginal: multiObjectiveResult.marginal.map(model => ({
                    ...model,
                    score: model.totalScore,
                    confidence: model.totalScore / 100,
                    reasoning: model.reasoning,
                    mathAnalysis: {
                        qualityScore: model.components.quality,
                        speedScore: model.components.speed,
                        ttfbScore: model.components.ttfb,
                        contextScore: model.components.context,
                        hardwareMatchScore: model.components.hardwareMatch
                    },
                    isOllamaInstalled: this.checkIfModelInstalled(model, ollamaIntegration),
                    ollamaInfo: this.getOllamaModelInfo(model, ollamaIntegration)
                })),
                incompatible: multiObjectiveResult.incompatible.map(model => ({
                    ...model,
                    score: model.totalScore,
                    confidence: model.totalScore / 100,
                    reasoning: model.reasoning,
                    isOllamaInstalled: this.checkIfModelInstalled(model, ollamaIntegration),
                    ollamaInfo: this.getOllamaModelInfo(model, ollamaIntegration)
                }))
            };
            
            // Agregar modelos sin puntuación alta a incompatibles
            allUniqueModels.forEach(model => {
                const alreadyIncluded = [...compatibility.compatible, ...compatibility.marginal, ...compatibility.incompatible]
                    .some(m => m.name === model.name);
                    
                if (!alreadyIncluded) {
                    compatibility.incompatible.push({
                        ...model,
                        score: 0,
                        issues: ['Low compatibility score with current hardware'],
                        mathAnalysis: { reason: 'Below threshold in mathematical analysis' }
                    });
                }
            });
            
            this.logger.info(`Mathematical heuristic results: ${compatibility.compatible.length} compatible, ${compatibility.marginal.length} marginal, ${compatibility.incompatible.length} incompatible`);
            
            return compatibility;
            
        } catch (error) {
            this.logger.error('Mathematical heuristic analysis failed, using fallback', { error: error.message });
            
            if (this.progress) {
                this.progress.warn('Advanced analysis failed, falling back to basic compatibility check');
            }
            
            // Fallback al método original
            const compatibility = this.compatibilityAnalyzer.analyzeCompatibility(hardware, staticModels);

            if (ollamaIntegration.compatibleOllamaModels && ollamaIntegration.compatibleOllamaModels.length > 0) {
                for (const ollamaModel of ollamaIntegration.compatibleOllamaModels) {
                    if (ollamaModel.matchedModel && ollamaModel.canRun) {
                        const enhancedModel = {
                            ...ollamaModel.matchedModel,
                            score: ollamaModel.compatibilityScore,
                            issues: ollamaModel.issues || [],
                            notes: [...(ollamaModel.notes || []), 'Installed in Ollama'],
                            performanceEstimate: ollamaModel.performanceEstimate,
                            isOllamaInstalled: true,
                            ollamaInfo: {
                                localName: ollamaModel.name,
                                isRunning: ollamaModel.isRunning,
                                cloudInfo: ollamaModel.cloudInfo
                            }
                        };

                        if (ollamaModel.compatibilityScore >= 75) {
                            compatibility.compatible.push(enhancedModel);
                        } else if (ollamaModel.compatibilityScore >= 60) {
                            compatibility.marginal.push(enhancedModel);
                        }
                    }
                }

                compatibility.compatible.sort((a, b) => b.score - a.score);
                compatibility.marginal.sort((a, b) => b.score - a.score);
            }
            
            return compatibility;
        }
    }

    findBestMatchingKey(ollamaModel, modelsMap) {
        const ollamaName = ollamaModel.model_name.toLowerCase();
        const ollamaId = ollamaModel.model_identifier.toLowerCase();
        
        // Buscar coincidencia exacta por nombre
        for (const [key, model] of modelsMap) {
            if (key.toLowerCase() === ollamaName || 
                model.name.toLowerCase() === ollamaName) {
                return key;
            }
        }
        
        // Buscar por palabras clave del identificador, priorizando matches más exactos
        const keywords = ollamaId.split(/[:\-_]/);
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [key, model] of modelsMap) {
            const modelName = model.name.toLowerCase();
            let score = 0;
            
            // Calcular score de coincidencia
            for (const keyword of keywords) {
                if (keyword.length > 2 && modelName.includes(keyword)) {
                    if (keyword === 'codellama' && ollamaId === 'codellama') {
                        score += 10; // Priorizar codellama exacto sobre phind-codellama
                    } else if (keyword === 'codellama') {
                        score += 5;
                    } else {
                        score += 1;
                    }
                }
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = key;
            }
        }
        
        return bestMatch;
    }
    
    createEnhancedModelFromOllama(ollamaModel, existingModel) {
        // Extract real file size from variants if available
        let realStorageSize = null;
        if (ollamaModel.variants && ollamaModel.variants.length > 0) {
            // Try to match based on the existing model size
            let mainVariant = null;
            
            if (existingModel.size) {
                // Extract size from existing model (e.g., "7B" -> "7b")
                const existingSize = existingModel.size.toLowerCase().replace('b', '');
                // Look for matching variant (e.g., "codellama:7b")
                mainVariant = ollamaModel.variants.find(v => 
                    v.tag.includes(`:${existingSize}b`) && !v.tag.includes('-instruct') && !v.tag.includes('-code')
                );
            }
            
            // Fallback to exact match or latest
            if (!mainVariant) {
                mainVariant = ollamaModel.variants.find(v => 
                    v.tag === ollamaModel.model_identifier || 
                    v.tag === `${ollamaModel.model_identifier}:latest`
                ) || ollamaModel.variants[0];
            }
            
            if (mainVariant && mainVariant.real_size_gb) {
                realStorageSize = mainVariant.real_size_gb;
            }
        }

        return {
            ...existingModel,
            ollamaId: ollamaModel.model_identifier,
            pulls: ollamaModel.pulls,
            lastUpdated: ollamaModel.last_updated,
            description: ollamaModel.description || existingModel.description,
            ollamaAvailable: true,
            requirements: {
                ...existingModel.requirements,
                // Update storage with real size if available
                storage: realStorageSize || existingModel.requirements?.storage
            },
            installation: {
                ...existingModel.installation,
                ollama: `ollama pull ${ollamaModel.model_identifier}`
            }
        };
    }
    
    createModelFromOllamaData(ollamaModel) {
        // Improved size detection with multiple patterns and fallbacks
        let sizeMatch = ollamaModel.model_identifier.match(/(\d+\.?\d*)[bm]/i);
        
        // Try alternative patterns if first doesn't work
        if (!sizeMatch) {
            // Try patterns like "llama3.1" -> estimate as 8B, "qwen2.5" -> 7B
            if (/llama3\.?[12]?/i.test(ollamaModel.model_identifier)) {
                sizeMatch = ['8b', '8'];
            } else if (/qwen2\.?5?/i.test(ollamaModel.model_identifier)) {
                sizeMatch = ['7b', '7'];
            } else if (/mistral/i.test(ollamaModel.model_identifier)) {
                sizeMatch = ['7b', '7'];
            } else if (/gemma/i.test(ollamaModel.model_identifier)) {
                sizeMatch = ['7b', '7'];
            } else if (/phi/i.test(ollamaModel.model_identifier)) {
                sizeMatch = ['3b', '3'];
            }
        }
        
        const size = sizeMatch ? sizeMatch[1] + 'B' : '7B'; // Default to 7B instead of Unknown
        const sizeNum = sizeMatch ? parseFloat(sizeMatch[1]) : 7; // Default to 7B
        
        // Extract real file size from variants if available
        let realStorageSize = null;
        if (ollamaModel.variants && ollamaModel.variants.length > 0) {
            // Find the main variant (usually the first one or one matching the base model name)
            const mainVariant = ollamaModel.variants.find(v => 
                v.tag === ollamaModel.model_identifier || 
                v.tag === `${ollamaModel.model_identifier}:latest`
            ) || ollamaModel.variants[0];
            
            if (mainVariant && mainVariant.real_size_gb) {
                realStorageSize = mainVariant.real_size_gb;
            }
        }
        
        let category = 'medium';
        if (sizeNum < 1) category = 'ultra_small';
        else if (sizeNum <= 4) category = 'small';
        else if (sizeNum <= 15) category = 'medium';
        else category = 'large';
        
        let specialization = 'general';
        const id = ollamaModel.model_identifier.toLowerCase();
        if (id.includes('code')) specialization = 'code';
        else if (id.includes('embed')) specialization = 'embeddings';
        
        return {
            name: ollamaModel.model_name,
            ollamaId: ollamaModel.model_identifier,
            size: size,
            type: 'local',
            category: category,
            specialization: specialization,
            frameworks: ['ollama'],
            requirements: {
                ram: Math.ceil(sizeNum * 0.6) || 2,
                vram: Math.ceil(sizeNum * 0.4) || 0,
                cpu_cores: Math.min(8, Math.max(2, Math.ceil(sizeNum / 2))),
                storage: realStorageSize || Math.ceil(sizeNum * 0.7) || 1
            },
            installation: {
                ollama: `ollama pull ${ollamaModel.model_identifier}`,
                description: ollamaModel.description || 'Available in Ollama library'
            },
            description: ollamaModel.description || `${ollamaModel.model_name} from Ollama`,
            pulls: ollamaModel.pulls,
            lastUpdated: ollamaModel.last_updated,
            year: 2024,
            ollamaAvailable: true
        };
    }
    
    checkIfModelInstalled(model, ollamaIntegration) {
        if (!ollamaIntegration.compatibleOllamaModels) return false;
        
        return ollamaIntegration.compatibleOllamaModels.some(installed => {
            return installed.name.toLowerCase().includes(model.ollamaId?.toLowerCase() || model.name.toLowerCase()) ||
                   (model.ollamaId?.toLowerCase() || model.name.toLowerCase()).includes(installed.name.toLowerCase());
        });
    }
    
    getOllamaModelInfo(model, ollamaIntegration) {
        if (!ollamaIntegration.compatibleOllamaModels) return null;
        
        const installedModel = ollamaIntegration.compatibleOllamaModels.find(installed => {
            return installed.name.toLowerCase().includes(model.ollamaId?.toLowerCase() || model.name.toLowerCase()) ||
                   (model.ollamaId?.toLowerCase() || model.name.toLowerCase()).includes(installed.name.toLowerCase());
        });
        
        return installedModel ? {
            localName: installedModel.name,
            isRunning: installedModel.isRunning,
            cloudInfo: installedModel.cloudInfo
        } : null;
    }

    async processFallbackModels(localModels, runningModels, availableModels, hardware, integration) {
        for (const ollamaModel of localModels) {
            const matchedModel = this.findMatchingModel(ollamaModel, availableModels);

            if (matchedModel) {
                const compatibility = this.compatibilityAnalyzer.calculateModelCompatibility(hardware, matchedModel);

                const enrichedOllamaModel = {
                    ...ollamaModel,
                    matchedModel,
                    compatibilityScore: compatibility.score,
                    issues: compatibility.issues,
                    notes: compatibility.notes,
                    isRunning: runningModels.some(r => r.name === ollamaModel.name),
                    canRun: compatibility.score >= 60,
                    performanceEstimate: await this.performanceAnalyzer.estimateModelPerformance(matchedModel, hardware)
                };

                integration.compatibleOllamaModels.push(enrichedOllamaModel);
            }
        }
    }

    findMatchingModelInDatabase(cloudModel, availableModels) {
        const cloudName = cloudModel.model_name.toLowerCase();
        const cloudId = cloudModel.model_identifier.toLowerCase();

        let match = availableModels.find(m =>
            m.name.toLowerCase() === cloudName ||
            m.name.toLowerCase().includes(cloudId)
        );

        if (match) return match;

        const keywords = cloudId.split('-');
        match = availableModels.find(model => {
            const modelName = model.name.toLowerCase();
            return keywords.some(keyword =>
                keyword.length > 2 && modelName.includes(keyword)
            );
        });

        return match;
    }

    createModelFromCloudData(cloudModel) {
        // Improved size detection for cloud models too
        let sizeMatch = cloudModel.model_identifier.match(/(\d+\.?\d*)[bm]/i);
        
        // Try alternative patterns if first doesn't work
        if (!sizeMatch) {
            if (/llama3\.?[12]?/i.test(cloudModel.model_identifier)) {
                sizeMatch = ['8b', '8'];
            } else if (/qwen2\.?5?/i.test(cloudModel.model_identifier)) {
                sizeMatch = ['7b', '7'];
            } else if (/mistral/i.test(cloudModel.model_identifier)) {
                sizeMatch = ['7b', '7'];
            } else if (/gemma/i.test(cloudModel.model_identifier)) {
                sizeMatch = ['7b', '7'];
            } else if (/phi/i.test(cloudModel.model_identifier)) {
                sizeMatch = ['3b', '3'];
            }
        }
        
        const size = sizeMatch ? sizeMatch[1] + 'B' : '7B'; // Default to 7B instead of Unknown

        let category = 'medium';
        if (size !== '7B') { // Changed from 'Unknown' check
            const sizeNum = parseFloat(size);
            const unit = size.slice(-1);
            const sizeInB = unit === 'M' ? sizeNum / 1000 : sizeNum;

            if (sizeInB < 1) category = 'ultra_small';
            else if (sizeInB <= 4) category = 'small';
            else if (sizeInB <= 15) category = 'medium';
            else category = 'large';
        }

        let specialization = 'general';
        const id = cloudModel.model_identifier.toLowerCase();
        if (id.includes('code')) specialization = 'code';
        else if (id.includes('chat')) specialization = 'chat';
        else if (id.includes('embed')) specialization = 'embeddings';

        return {
            name: cloudModel.model_name,
            size: size,
            type: 'local',
            category: category,
            specialization: specialization,
            frameworks: ['ollama'],
            requirements: {
                ram: Math.ceil((parseFloat(size) || 4) * 0.6),
                vram: Math.ceil((parseFloat(size) || 4) * 0.4),
                cpu_cores: 4,
                storage: Math.ceil((parseFloat(size) || 4) * 0.7)
            },
            installation: {
                ollama: `ollama pull ${cloudModel.model_identifier}`,
                description: cloudModel.description || 'Model from Ollama library'
            },
            year: 2024,
            description: cloudModel.description || `${cloudModel.model_name} model`,
            cloudData: {
                pulls: cloudModel.pulls,
                url: cloudModel.url,
                model_type: cloudModel.model_type,
                identifier: cloudModel.model_identifier
            }
        };
    }

    findMatchingModel(ollamaModel, availableModels) {
        const ollamaName = ollamaModel.name.toLowerCase();

        const nameMapping = {
            'llama3.2:3b': 'Llama 3.2 3B',
            'llama3.1:8b': 'Llama 3.1 8B',
            'mistral:7b': 'Mistral 7B v0.3',
            'mistral:latest': 'Mistral 7B v0.3',
            'codellama:7b': 'CodeLlama 7B',
            'phi3:mini': 'Phi-3 Mini 3.8B',
            'gemma2:2b': 'Gemma 2B',
            'tinyllama:1.1b': 'TinyLlama 1.1B',
            'qwen2.5:7b': 'Qwen 2.5 7B'
        };

        if (nameMapping[ollamaName]) {
            return availableModels.find(m => m.name === nameMapping[ollamaName]);
        }

        const modelKeywords = ollamaName.split(':')[0].split('-');

        return availableModels.find(model => {
            const modelName = model.name.toLowerCase();
            return modelKeywords.some(keyword =>
                keyword.length > 2 && modelName.includes(keyword)
            );
        });
    }

    async generateOllamaRecommendations(hardware, availableModels, installedModels) {
        const recommendations = [];
        const installedNames = new Set(installedModels.map(m => m.name.toLowerCase()));

        const compatibleModels = availableModels.filter(model => {
            const compatibility = this.compatibilityAnalyzer.calculateModelCompatibility(hardware, model);
            return compatibility.score >= 75 && model.frameworks?.includes('ollama');
        });

        for (const model of compatibleModels.slice(0, 5)) {
            const ollamaCommand = this.getOllamaCommand(model);

            if (ollamaCommand && !installedNames.has(ollamaCommand.split(' ')[2])) {
                const performance = await this.performanceAnalyzer.estimateModelPerformance(model, hardware);

                recommendations.push({
                    model,
                    command: ollamaCommand,
                    reason: this.getRecommendationReason(model, hardware),
                    estimatedPerformance: performance,
                    priority: this.calculatePriority(model, hardware)
                });
            }
        }

        return recommendations.sort((a, b) => b.priority - a.priority);
    }

    async enrichWithPerformanceData(hardware, compatibility) {
        const performanceEstimates = new Map();

        for (const model of [...compatibility.compatible, ...compatibility.marginal]) {
            try {
                const estimate = await this.performanceAnalyzer.estimateModelPerformance(model, hardware);
                performanceEstimates.set(model.name, estimate);

                model.performanceEstimate = estimate;
                model.tokensPerSecond = estimate.estimatedTokensPerSecond;
                model.loadTime = estimate.loadTimeEstimate;
            } catch (error) {
                this.logger.warn(`Failed to estimate performance for ${model.name}`, { error });
            }
        }

        return {
            ...compatibility,
            performanceEstimates: Object.fromEntries(performanceEstimates)
        };
    }

    async generateEnhancedRecommendations(hardware, results, ollamaIntegration, useCase) {
        const recommendations = {
            general: [],
            installedModels: [],
            cloudSuggestions: [],
            quickCommands: []
        };

        const generalRecs = this.compatibilityAnalyzer.generateRecommendations(hardware, results);
        recommendations.general.push(...generalRecs);

        if (ollamaIntegration.ollamaInfo.available) {
            if (ollamaIntegration.compatibleOllamaModels.length === 0) {
                recommendations.general.push('No compatible models installed in Ollama');
            } else {
                recommendations.installedModels.push(`${ollamaIntegration.compatibleOllamaModels.length} compatible models found in Ollama:`);

                ollamaIntegration.compatibleOllamaModels.forEach((model, index) => {
                    const runningStatus = model.isRunning ? ' (running)' : '';
                    const score = model.compatibilityScore || 'N/A';
                    recommendations.installedModels.push(`${index + 1}. ${model.name} (Score: ${score}/100)${runningStatus}`);
                });

                const bestModel = ollamaIntegration.compatibleOllamaModels
                    .sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0))[0];

                if (bestModel) {
                    recommendations.quickCommands.push(`ollama run ${bestModel.name}`);
                }
            }

            this.logger.info('Searching for cloud recommendations...');
            try {
                const cloudRecommendations = await this.searchOllamaCloudRecommendations(hardware, ollamaIntegration.compatibleOllamaModels);

                if (cloudRecommendations.length > 0) {
                    this.logger.info(`Found ${cloudRecommendations.length} cloud recommendations`);
                    recommendations.cloudSuggestions.push('Recommended models from Ollama library for your hardware:');
                    cloudRecommendations.forEach((model, index) => {
                        recommendations.cloudSuggestions.push(`${index + 1}. ollama pull ${model.identifier} - ${model.reason} (${model.pulls.toLocaleString()} pulls)`);
                        recommendations.quickCommands.push(`ollama pull ${model.identifier}`);
                    });
                } else {
                    this.logger.warn('No cloud recommendations found, using fallback');
                    this.addFallbackSuggestions(recommendations, ollamaIntegration.compatibleOllamaModels);
                }
            } catch (error) {
                this.logger.error('Failed to get cloud recommendations:', error);
                this.addFallbackSuggestions(recommendations, ollamaIntegration.compatibleOllamaModels);
            }

        } else {
            recommendations.general.push('Install Ollama for local LLM management: https://ollama.ai');
        }

        const useCaseRecs = this.getUseCaseRecommendations(results, useCase);
        recommendations.general.push(...useCaseRecs);

        return recommendations;
    }

    addFallbackSuggestions(recommendations, installedModels) {
        const installedNames = new Set(installedModels.map(m => m.name.toLowerCase()));

        const allSuggestions = [
            { name: 'qwen:0.5b', reason: 'Ultra-fast 0.5B model, runs on any hardware', minRAM: 1, tier: 'any' },
            { name: 'tinyllama:1.1b', reason: 'Tiny but capable, perfect for testing', minRAM: 2, tier: 'any' },
            { name: 'phi3:mini', reason: 'Microsoft\'s efficient 3.8B model with excellent reasoning', minRAM: 4, tier: 'low' },
            { name: 'llama3.2:1b', reason: 'Meta\'s latest compact 1B model', minRAM: 2, tier: 'any' },
            { name: 'llama3.2:3b', reason: 'Meta\'s balanced 3B model', minRAM: 4, tier: 'low' },
            { name: 'gemma2:2b', reason: 'Google\'s optimized 2B model', minRAM: 3, tier: 'any' },
            { name: 'mistral:7b', reason: 'High-quality European 7B model', minRAM: 8, tier: 'medium' },
            { name: 'llama3.1:8b', reason: 'Meta\'s flagship 8B model', minRAM: 10, tier: 'medium' },
            { name: 'qwen2.5:7b', reason: 'Advanced Chinese 7B model', minRAM: 8, tier: 'medium' },
            { name: 'codellama:7b', reason: 'Specialized for coding tasks', minRAM: 8, tier: 'medium', specialty: 'code' },
            { name: 'nomic-embed-text', reason: 'Best for text embeddings', minRAM: 2, tier: 'any', specialty: 'embeddings' }
        ];

        const availableSuggestions = allSuggestions.filter(model =>
            !installedNames.has(model.name) && !installedNames.has(model.name.split(':')[0])
        );

        if (availableSuggestions.length > 0) {
            recommendations.cloudSuggestions.push('Curated model suggestions for your hardware:');
            availableSuggestions.slice(0, 5).forEach((model, index) => {
                recommendations.cloudSuggestions.push(`${index + 1}. ollama pull ${model.name} - ${model.reason}`);
                recommendations.quickCommands.push(`ollama pull ${model.name}`);
            });
        }
    }

    async searchOllamaCloudRecommendations(hardware, installedModels) {
        try {
            this.logger.info('Searching Ollama cloud for compatible models...');
            const { getOllamaModelsIntegration } = require('./ollama/native-scraper');

            const allModelsData = await getOllamaModelsIntegration([]);

            if (!allModelsData.recommendations || allModelsData.recommendations.length === 0) {
                this.logger.warn('No recommendations found from cloud search');
                return [];
            }

            this.logger.info(`Found ${allModelsData.recommendations.length} total models from cloud`);

            const installedIdentifiers = new Set(
                installedModels.map(m => {
                    const name = m.name.toLowerCase();
                    return name.split(':')[0];
                })
            );

            this.logger.info(`Installed models identifiers: ${Array.from(installedIdentifiers).join(', ')}`);

            const hardwareTier = this.getHardwareTier(hardware);
            this.logger.info(`Hardware tier: ${hardwareTier}`);

            const compatibleModels = allModelsData.recommendations
                .filter(model => {
                    const baseIdentifier = model.model_identifier.split(':')[0].toLowerCase();
                    const isNotInstalled = !installedIdentifiers.has(baseIdentifier) &&
                        !installedIdentifiers.has(model.model_identifier.toLowerCase());

                    if (!isNotInstalled) {
                        this.logger.debug(`Skipping already installed model: ${model.model_identifier}`);
                    }
                    return isNotInstalled;
                })
                .map(model => {
                    const score = this.calculateCloudModelCompatibility(model, hardware);
                    return {
                        ...model,
                        compatibilityScore: score,
                        reason: this.getCloudModelReason(model, hardware)
                    };
                })
                .filter(model => {
                    const isCompatible = model.compatibilityScore >= 60;
                    if (!isCompatible) {
                        this.logger.debug(`Model ${model.model_identifier} has low compatibility score: ${model.compatibilityScore}`);
                    }
                    return isCompatible;
                })
                .sort((a, b) => {
                    if (b.compatibilityScore !== a.compatibilityScore) {
                        return b.compatibilityScore - a.compatibilityScore;
                    }
                    return (b.pulls || 0) - (a.pulls || 0);
                })
                .slice(0, 5);

            this.logger.info(`Final compatible models for recommendations: ${compatibleModels.length}`);
            compatibleModels.forEach(model => {
                this.logger.debug(`Recommending: ${model.model_identifier} (score: ${model.compatibilityScore}, pulls: ${model.pulls})`);
            });

            return compatibleModels.map(model => ({
                identifier: model.model_identifier,
                name: model.model_name,
                pulls: model.pulls || 0,
                reason: model.reason,
                score: model.compatibilityScore,
                size: this.extractModelSize(model.model_identifier),
                description: model.description || ''
            }));

        } catch (error) {
            this.logger.error('Error searching Ollama cloud recommendations:', error);
            return [];
        }
    }

    getHardwareTier(hardware) {
        const ram = hardware.memory.total;
        const cores = hardware.cpu.cores;
        
        // Seguir exactamente la clasificación oficial documentada:
        // EXTREME (64+ GB RAM, 16+ cores) - Can run 70B+ models
        // VERY HIGH (32-64 GB RAM, 12+ cores) - Optimal for 13B-30B models  
        // HIGH (16-32 GB RAM, 8-12 cores) - Perfect for 7B-13B models
        // MEDIUM (8-16 GB RAM, 4-8 cores) - Suitable for 3B-7B models
        // LOW (4-8 GB RAM, 2-4 cores) - Limited to 1B-3B models
        
        if (ram >= 64 && cores >= 16) return 'extreme';
        if (ram >= 32 && cores >= 12) return 'very_high';    // Tu caso: 24GB < 32GB, pero 12 cores ≥ 12
        if (ram >= 16 && cores >= 8) return 'high';          // Criteria: 16-32GB RAM, 8-12 cores
        if (ram >= 8 && cores >= 4) return 'medium';         // Criteria: 8-16GB RAM, 4-8 cores
        if (ram >= 4 && cores >= 2) return 'low';            // Criteria: 4-8GB RAM, 2-4 cores
        
        // Caso especial: cumplir uno de los dos criterios principales
        // Tu M4 Pro: 24GB RAM (16-32 range) + 12 cores (≥12) = HIGH tier
        if (ram >= 16 && ram < 32 && cores >= 12) return 'high';  // HIGH tier pero con cores altos
        if (ram >= 32 && ram < 64 && cores >= 8) return 'very_high'; // VERY HIGH con cores medios
        
        return 'ultra_low';
    }

    calculateCloudModelCompatibility(model, hardware) {
        let score = 50;

        const sizeMatch = model.model_identifier.match(/(\d+\.?\d*)[bm]/i);
        let modelSizeB = 1;

        if (sizeMatch) {
            const num = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[0].slice(-1).toLowerCase();
            modelSizeB = unit === 'm' ? num / 1000 : num;
        }

        const estimatedRAM = modelSizeB * 1.2;
        const ramRatio = hardware.memory.total / estimatedRAM;

        if (ramRatio >= 3) {
            score += 40;
        } else if (ramRatio >= 2) {
            score += 30;
        } else if (ramRatio >= 1.5) {
            score += 20;
        } else if (ramRatio >= 1.2) {
            score += 10;
        } else {
            score -= 20;
        }

        if (modelSizeB <= 0.5) {
            score += 25;
        } else if (modelSizeB <= 1) {
            score += 20;
        } else if (modelSizeB <= 3) {
            score += 15;
        } else if (modelSizeB <= 7) {
            score += 10;
        } else if (modelSizeB <= 13) {
            score += 5;
        } else {
            score -= 15;
        }

        const hardwareTier = this.getHardwareTier(hardware);
        switch (hardwareTier) {
            case 'ultra_high':
                score += 15;
                break;
            case 'high':
                score += 10;
                break;
            case 'medium':
                score += 5;
                break;
            case 'low':
                if (modelSizeB <= 3) score += 5;
                break;
            case 'ultra_low':
                if (modelSizeB <= 1) score += 10;
                else score -= 10;
                break;
        }

        if (hardware.cpu.cores >= 8) {
            score += 10;
        } else if (hardware.cpu.cores >= 4) {
            score += 5;
        } else if (hardware.cpu.cores < 4) {
            score -= 5;
        }

        const pulls = model.pulls || 0;
        if (pulls > 10000000) {
            score += 15;
        } else if (pulls > 1000000) {
            score += 10;
        } else if (pulls > 100000) {
            score += 5;
        }

        if (model.model_type === 'official') {
            score += 8;
        }

        const identifier = model.model_identifier.toLowerCase();
        if (identifier.includes('tinyllama') || identifier.includes('phi3') || identifier.includes('qwen')) {
            score += 5;
        }

        if (identifier.includes('code') && hardware.cpu.cores >= 6) {
            score += 5;
        }

        if (identifier.includes('mini') || identifier.includes('tiny')) {
            score += 8;
        }

        if (hardware.cpu.architecture === 'Apple Silicon') {
            score += 5;
        }

        this.logger.debug(`Model ${model.model_identifier}: size=${modelSizeB}B, RAM ratio=${ramRatio.toFixed(2)}, score=${score}`);

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    getCloudModelReason(model, hardware) {
        const identifier = model.model_identifier.toLowerCase();
        const sizeMatch = model.model_identifier.match(/(\d+\.?\d*)[bm]/i);
        const modelSizeB = sizeMatch ?
            (sizeMatch[0].slice(-1).toLowerCase() === 'm' ? parseFloat(sizeMatch[1]) / 1000 : parseFloat(sizeMatch[1])) : 1;

        if (identifier.includes('qwen') && modelSizeB <= 1) {
            return 'Ultra-efficient Chinese model, great for limited hardware';
        }
        if (identifier.includes('tinyllama')) {
            return 'Tiny but capable, perfect for testing and light tasks';
        }
        if (identifier.includes('phi3') && identifier.includes('mini')) {
            return 'Microsoft\'s efficient model with excellent reasoning';
        }
        if (identifier.includes('gemma') && modelSizeB <= 2) {
            return 'Google\'s compact model, well-optimized';
        }
        if (identifier.includes('mistral') && modelSizeB <= 7) {
            return 'High-quality European model, excellent performance';
        }
        if (identifier.includes('llama3.2') && modelSizeB <= 3) {
            return 'Meta\'s latest compact model, state-of-the-art';
        }
        if (identifier.includes('code')) {
            return 'Specialized for coding tasks';
        }

        const ramRatio = hardware.memory.total / (modelSizeB * 0.6);

        if (modelSizeB <= 1) {
            return 'Ultra-small model, runs very fast on your hardware';
        } else if (modelSizeB <= 3 && ramRatio >= 2) {
            return 'Small model with good performance balance';
        } else if (modelSizeB <= 7 && ramRatio >= 1.5) {
            return 'Medium-sized model, good capabilities';
        } else if (ramRatio >= 1.2) {
            return 'Should run well on your system';
        } else {
            return 'Recommended with quantization for your hardware';
        }
    }

    extractModelSize(identifier) {
        const sizeMatch = identifier.match(/(\d+\.?\d*)[bm]/i);
        if (sizeMatch) {
            const num = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[0].slice(-1).toUpperCase();
            return `${num}${unit}`;
        }
        return 'Unknown';
    }

    getOllamaCommand(model) {
        const mapping = {
            'TinyLlama 1.1B': 'ollama pull tinyllama:1.1b',
            'Qwen 0.5B': 'ollama pull qwen:0.5b',
            'Gemma 2B': 'ollama pull gemma2:2b',
            'Phi-3 Mini 3.8B': 'ollama pull phi3:mini',
            'Llama 3.2 3B': 'ollama pull llama3.2:3b',
            'Llama 3.1 8B': 'ollama pull llama3.1:8b',
            'Mistral 7B v0.3': 'ollama pull mistral:7b',
            'CodeLlama 7B': 'ollama pull codellama:7b',
            'Qwen 2.5 7B': 'ollama pull qwen2.5:7b'
        };

        return mapping[model.name] || null;
    }

    getRecommendationReason(model, hardware) {
        if (model.specialization === 'code') {
            return 'Excellent for coding tasks';
        }
        if (hardware.memory.total >= 16 && model.size.includes('8B')) {
            return 'Perfect size for your RAM capacity';
        }
        if (model.category === 'small' && hardware.memory.total < 16) {
            return 'Optimized for systems with limited RAM';
        }
        return 'Great balance of performance and efficiency';
    }

    calculatePriority(model, hardware) {
        let priority = 50;
        const modelSize = this.parseModelSize(model.size);
        const requiredRAM = model.requirements?.ram || 4;
        const ramRatio = hardware.memory.total / requiredRAM;

        if (ramRatio >= 2) priority += 20;
        else if (ramRatio >= 1.5) priority += 10;
        else if (ramRatio < 1) priority -= 20;

        if (modelSize <= 1) priority += 15;
        else if (modelSize <= 3) priority += 10;
        else if (modelSize <= 7) priority += 5;
        else if (modelSize > 30) priority -= 15;

        if (model.specialization === 'code') priority += 15;
        else if (model.specialization === 'chat') priority += 10;
        else if (model.specialization === 'embeddings') priority += 5;

        if (model.year >= 2024) priority += 10;
        else if (model.year >= 2023) priority += 5;

        if (hardware.gpu.dedicated && model.requirements?.vram > 0) {
            if (hardware.gpu.vram >= model.requirements.vram) {
                priority += 10;
            } else {
                priority -= 5;
            }
        }

        if (hardware.cpu.architecture === 'Apple Silicon' &&
            model.frameworks?.includes('llama.cpp')) {
            priority += 8;
        }

        return Math.max(0, priority);
    }

    parseModelSize(sizeString) {
        const match = sizeString.match(/(\d+\.?\d*)[BM]/i);
        if (!match) return 1;

        const num = parseFloat(match[1]);
        const unit = match[0].slice(-1).toUpperCase();

        return unit === 'B' ? num : num / 1000;
    }

    getUseCaseRecommendations(results, useCase) {
        const recommendations = [];

        switch (useCase) {
            case 'code':
                const codeModels = results.compatible.filter(m => m.specialization === 'code');
                if (codeModels.length > 0) {
                    recommendations.push(`Top coding model: ${codeModels[0].name}`);
                }
                break;

            case 'chat':
                const chatModels = results.compatible.filter(m =>
                    m.specialization === 'chat' || m.specialization === 'general'
                );
                if (chatModels.length > 0) {
                    recommendations.push(`Best chat model: ${chatModels[0].name}`);
                }
                break;

            case 'multimodal':
                const multiModels = results.compatible.filter(m => m.multimodal);
                if (multiModels.length > 0) {
                    recommendations.push(`Multimodal option: ${multiModels[0].name}`);
                }
                break;
        }

        return recommendations;
    }

    generateEnhancedSummary(hardware, results, ollamaIntegration) {
        const baseSummary = this.generateSummary(hardware, results);

        return {
            ...baseSummary,
            ollama: {
                available: ollamaIntegration.ollamaInfo.available,
                installedModels: ollamaIntegration.compatibleOllamaModels.length,
                runningModels: ollamaIntegration.currentlyRunning.length,
                recommendedInstalls: ollamaIntegration.recommendedPulls.length
            },
            hardwareTier: this.getHardwareTier(hardware),
            topPerformanceModel: this.getTopPerformanceModel(results)
        };
    }

    getTopPerformanceModel(results) {
        if (results.compatible.length === 0) return null;

        const sorted = results.compatible
            .filter(m => m.performanceEstimate)
            .sort((a, b) => (b.performanceEstimate.estimatedTokensPerSecond || 0) -
                (a.performanceEstimate.estimatedTokensPerSecond || 0));

        return sorted[0] || results.compatible[0];
    }

    async analyzeOllamaModel(modelName) {
        try {
            const [hardware, model] = await Promise.all([
                this.getSystemInfo(),
                Promise.resolve(this.findModel(modelName))
            ]);

            if (!model) {
                throw new Error(`Model "${modelName}" not found in database`);
            }

            const [localModels, runningModels] = await Promise.all([
                this.ollamaClient.getLocalModels().catch(() => []),
                this.ollamaClient.getRunningModels().catch(() => [])
            ]);

            const isInstalled = localModels.some(m => m.name.toLowerCase().includes(modelName.toLowerCase()));
            const isRunning = runningModels.some(m => m.name.toLowerCase().includes(modelName.toLowerCase()));

            const [compatibility, performance] = await Promise.all([
                Promise.resolve(this.compatibilityAnalyzer.calculateModelCompatibility(hardware, model)),
                this.performanceAnalyzer.estimateModelPerformance(model, hardware)
            ]);

            let benchmarkResults = null;
            if (isInstalled) {
                try {
                    benchmarkResults = await this.performanceAnalyzer.benchmarkInferenceSpeed(
                        modelName, hardware, this.ollamaClient
                    );
                } catch (error) {
                    this.logger.warn(`Benchmark failed for ${modelName}`, { error });
                }
            }

            return {
                model,
                hardware,
                status: {
                    installed: isInstalled,
                    running: isRunning,
                    canRun: compatibility.score >= 60
                },
                compatibility,
                performance,
                benchmarkResults,
                recommendations: this.generateModelSpecificRecommendations(model, hardware, compatibility)
            };

        } catch (error) {
            this.logger.error('Model analysis failed', { error: error.message, component: 'LLMChecker', method: 'analyzeOllamaModel' });
            throw error;
        }
    }

    generateModelSpecificRecommendations(model, hardware, compatibility) {
        const recommendations = [];

        if (compatibility.score < 60) {
            recommendations.push('Model may not run well on this hardware');
            recommendations.push('Consider using heavy quantization (Q2_K, Q3_K_M)');
        } else if (compatibility.score < 75) {
            recommendations.push('✅ Model should run with some optimizations');
            recommendations.push('🎯 Use Q4_K_M quantization for best balance');
        } else {
            recommendations.push('Model should run excellently on this hardware');
            if (hardware.memory.total >= 32) {
                recommendations.push('You can use higher quality quantization (Q5_K_M, Q6_K)');
            }
        }

        if (hardware.gpu.dedicated && hardware.gpu.vram >= (model.requirements?.vram || 0)) {
            recommendations.push('Enable GPU acceleration for faster inference');
        }

        return recommendations;
    }

    filterModels(models, filter) {
        switch (filter.toLowerCase()) {
            case 'local':
                return models.filter(m => m.type === 'local');
            case 'cloud':
                return models.filter(m => m.type === 'cloud');
            case 'ultra_small':
                return models.filter(m => m.category === 'ultra_small');
            case 'small':
                return models.filter(m => m.category === 'small');
            case 'medium':
                return models.filter(m => m.category === 'medium');
            case 'large':
                return models.filter(m => m.category === 'large');
            case 'code':
                return models.filter(m => m.specialization === 'code');
            case 'chat':
                return models.filter(m => m.specialization === 'chat' || !m.specialization);
            case 'multimodal':
                return models.filter(m => m.specialization === 'multimodal' || m.multimodal);
            case 'embeddings':
                return models.filter(m => m.specialization === 'embeddings');
            default:
                return models;
        }
    }

    generateSummary(hardware, compatibility) {
        return {
            grade: this.calculateGrade(compatibility),
            systemClass: this.getSystemClass(hardware),
            compatibleCount: compatibility.compatible.length,
            marginalCount: compatibility.marginal.length,
            incompatibleCount: compatibility.incompatible.length,
            totalModels: compatibility.compatible.length + compatibility.marginal.length + compatibility.incompatible.length
        };
    }

    calculateGrade(compatibility) {
        const total = compatibility.compatible.length + compatibility.marginal.length + compatibility.incompatible.length;
        const compatiblePercent = total > 0 ? (compatibility.compatible.length / total) * 100 : 0;

        if (compatiblePercent >= 80) return 'A';
        if (compatiblePercent >= 60) return 'B';
        if (compatiblePercent >= 40) return 'C';
        if (compatiblePercent >= 20) return 'D';
        return 'F';
    }

    getSystemClass(hardware) {
        if (hardware.memory.total >= 32 && hardware.gpu.vram >= 16) return 'High End';
        if (hardware.memory.total >= 16 && hardware.gpu.vram >= 8) return 'Mid Range';
        if (hardware.memory.total >= 8) return 'Budget';
        return 'Entry Level';
    }

    async getOllamaInfo() {
        return await this.integrateOllamaModels(await this.getSystemInfo(), []);
    }

    async getSystemInfo() {
        return await this.hardwareDetector.getSystemInfo();
    }

    getAllModels() {
        return this.expandedModelsDatabase.getAllModels();
    }

    findModel(name) {
        return this.expandedModelsDatabase.findModel ?
            this.expandedModelsDatabase.findModel(name) :
            this.getAllModels().find(m => m.name.toLowerCase().includes(name.toLowerCase()));
    }


    async generateIntelligentRecommendations(hardware) {
        try {
            this.logger.info('Generating intelligent recommendations...');
            
            // Obtener todos los modelos de Ollama
            const ollamaData = await this.ollamaScraper.scrapeAllModels(false);
            const allModels = ollamaData.models || [];

            if (allModels.length === 0) {
                this.logger.warn('No Ollama models available for recommendations');
                return null;
            }

            // Generar recomendaciones inteligentes
            const recommendations = await this.intelligentRecommender.getBestModelsForHardware(hardware, allModels);
            const summary = this.intelligentRecommender.generateRecommendationSummary(recommendations, hardware);

            this.logger.info(`Generated recommendations for ${Object.keys(recommendations).length} categories`);
            
            return {
                recommendations,
                summary,
                totalModelsAnalyzed: allModels.length,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('Failed to generate intelligent recommendations', { error: error.message });
            return null;
        }
    }

}

module.exports = LLMChecker;
// Plant Care JavaScript

// Global variables
let currentUser = null;
let userPlants = [];
let userSeeds = [];
let userResources = {
    water: 10,
    energy: 20,
    coins: 50
};
let userAchievements = [];
let selectedPlotIndex = -1;
let selectedSeedIndex = -1;
let friendGardens = [];
let plantTypes = [];
let shopItems = [];
let achievements = [];
let gardenSize = 9; // Initial garden size (3x3)
let userData = {}; // Add userData as global variable

// Weather effect variables
let currentWeatherEffect = null;
let weatherEffectTimer = null;
let weatherEffectDuration = 60000; // 1 minute in milliseconds
let weatherEffectCooldown = 300000; // 5 minutes in milliseconds

// Weather effect types and their probabilities
const weatherEffects = {
    rain: {
        name: 'Mưa',
        probability: 0.15, // 15% chance
        valueMultiplier: 1.5, // 50% increase in value
        cssClass: 'rain-effect',
        description: 'Cây được tưới tự động và tăng 50% giá trị'
    },
    sandstorm: {
        name: 'Bão Cát',
        probability: 0.1, // 10% chance
        valueMultiplier: 1.75, // 75% increase in value
        cssClass: 'sandstorm-effect',
        description: 'Cây chịu được bão cát sẽ tăng 75% giá trị'
    },
    rainbow: {
        name: 'Cầu Vồng',
        probability: 0.05, // 5% chance
        valueMultiplier: 2, // 100% increase in value
        cssClass: 'rainbow-effect',
        description: 'Cây được phủ ánh cầu vồng và tăng gấp đôi giá trị'
    }
}

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            setupUserInterface();
            loadUserData();
        } else {
            // User is not logged in, show login prompt or guest mode
            document.getElementById('gardenSection').style.display = 'none';
            document.getElementById('startGardenBtn').addEventListener('click', function() {
                document.getElementById('loginModal').style.display = 'flex';
            });
        }
    });

    // Initialize plant types
    initializePlantTypes();
    
    // Initialize shop items
    initializeShopItems();
    
    // Initialize achievements
    initializeAchievements();
    
    // Setup event listeners
    setupEventListeners();
});

// Initialize plant types
function initializePlantTypes() {
    plantTypes = [
        {
            id: 'sunflower',
            name: 'Hoa Hướng Dương',
            growthTime: 5 * 60, // 5 minutes in seconds
            waterNeeded: 2,
            waterInterval: 2 * 60, // 2 minutes in seconds
            harvestReward: { coins: 10 },
            stages: [
                { name: 'Hạt giống', image: 'assets/plant-sunflower-seed.svg' },
                { name: 'Nảy mầm', image: 'assets/plant-sunflower-seedling.svg' },
                { name: 'Phát triển', image: 'assets/plant-sunflower-growing.svg' },
                { name: 'Trưởng thành', image: 'assets/plant-sunflower-mature.svg' }
            ],
            rarity: 'common'
        },
        {
            id: 'rose',
            name: 'Hoa Hồng',
            growthTime: 10 * 60, // 10 minutes in seconds
            waterNeeded: 3,
            waterInterval: 3 * 60, // 3 minutes in seconds
            harvestReward: { coins: 20 },
            stages: [
                { name: 'Hạt giống', image: 'assets/plant-rose-seed.svg' },
                { name: 'Nảy mầm', image: 'assets/plant-rose-seedling.svg' },
                { name: 'Phát triển', image: 'assets/plant-rose-growing.svg' },
                { name: 'Trưởng thành', image: 'assets/plant-rose-mature.svg' }
            ],
            rarity: 'uncommon'
        },
        {
            id: 'lavender',
            name: 'Hoa Oải Hương',
            growthTime: 15 * 60, // 15 minutes in seconds
            waterNeeded: 3,
            waterInterval: 4 * 60, // 4 minutes in seconds
            harvestReward: { coins: 30 },
            stages: [
                { name: 'Hạt giống', image: 'assets/plant-lavender-seed.svg' },
                { name: 'Nảy mầm', image: 'assets/plant-lavender-seedling.svg' },
                { name: 'Phát triển', image: 'assets/plant-lavender-growing.svg' },
                { name: 'Trưởng thành', image: 'assets/plant-lavender-mature.svg' }
            ],
            rarity: 'uncommon'
        },
        {
            id: 'cactus',
            name: 'Xương Rồng',
            growthTime: 25 * 60, // 25 minutes in seconds
            waterNeeded: 1, // Cactus needs less water
            waterInterval: 10 * 60, // 10 minutes in seconds - longer interval
            harvestReward: { coins: 40 },
            stages: [
                { name: 'Hạt giống', image: 'assets/plant-cactus-seed.svg' },
                { name: 'Nảy mầm', image: 'assets/plant-cactus-seedling.svg' },
                { name: 'Phát triển', image: 'assets/plant-cactus-growing.svg' },
                { name: 'Trưởng thành', image: 'assets/plant-cactus-mature.svg' }
            ],
            rarity: 'rare'
        },
        {
            id: 'bonsai',
            name: 'Cây Bonsai',
            growthTime: 20 * 60, // 20 minutes in seconds
            waterNeeded: 4,
            waterInterval: 5 * 60, // 5 minutes in seconds
            harvestReward: { coins: 50 },
            stages: [
                { name: 'Hạt giống', image: 'assets/plant-bonsai-seed.svg' },
                { name: 'Nảy mầm', image: 'assets/plant-bonsai-seedling.svg' },
                { name: 'Phát triển', image: 'assets/plant-bonsai-growing.svg' },
                { name: 'Trưởng thành', image: 'assets/plant-bonsai-mature.svg' }
            ],
            rarity: 'rare'
        },
        {
            id: 'lotus',
            name: 'Hoa Sen',
            growthTime: 30 * 60, // 30 minutes in seconds
            waterNeeded: 5,
            waterInterval: 6 * 60, // 6 minutes in seconds
            harvestReward: { coins: 100 },
            stages: [
                { name: 'Hạt giống', image: 'assets/plant-lotus-seed.svg' },
                { name: 'Nảy mầm', image: 'assets/plant-lotus-seedling.svg' },
                { name: 'Phát triển', image: 'assets/plant-lotus-growing.svg' },
                { name: 'Trưởng thành', image: 'assets/plant-lotus-mature.svg' }
            ],
            rarity: 'legendary'
        },
        {
            id: 'cherry',
            name: 'Hoa Anh Đào',
            growthTime: 18 * 60, // 18 minutes in seconds
            waterNeeded: 4,
            waterInterval: 4 * 60, // 4 minutes in seconds
            harvestReward: { coins: 45 },
            stages: [
                { name: 'Hạt giống', image: 'assets/plant-cherry-seed.svg' },
                { name: 'Nảy mầm', image: 'assets/plant-cherry-seedling.svg' },
                { name: 'Phát triển', image: 'assets/plant-cherry-growing.svg' },
                { name: 'Trưởng thành', image: 'assets/plant-cherry-mature.svg' }
            ],
            rarity: 'rare'
        },
        {
            id: 'bamboo',
            name: 'Cây Tre',
            growthTime: 12 * 60, // 12 minutes in seconds
            waterNeeded: 3,
            waterInterval: 5 * 60, // 5 minutes in seconds
            harvestReward: { coins: 35 },
            stages: [
                { name: 'Hạt giống', image: 'assets/plant-bamboo-seed.svg' },
                { name: 'Nảy mầm', image: 'assets/plant-bamboo-seedling.svg' },
                { name: 'Phát triển', image: 'assets/plant-bamboo-growing.svg' },
                { name: 'Trưởng thành', image: 'assets/plant-bamboo-mature.svg' }
            ],
            rarity: 'uncommon'
        },
        {
            id: 'dragonfruit',
            name: 'Thanh Long',
            growthTime: 35 * 60, // 35 minutes in seconds
            waterNeeded: 4,
            waterInterval: 7 * 60, // 7 minutes in seconds
            harvestReward: { coins: 120 },
            stages: [
                { name: 'Hạt giống', image: 'assets/plant-dragonfruit-seed.svg' },
                { name: 'Nảy mầm', image: 'assets/plant-dragonfruit-seedling.svg' },
                { name: 'Phát triển', image: 'assets/plant-dragonfruit-growing.svg' },
                { name: 'Trưởng thành', image: 'assets/plant-dragonfruit-mature.svg' }
            ],
            rarity: 'legendary'
        }
    ];
}

// Initialize shop items
function initializeShopItems() {
    shopItems = [
        {
            id: 'sunflower_seed',
            name: 'Hạt Hướng Dương',
            description: 'Hạt giống hoa hướng dương, dễ trồng và phát triển nhanh.',
            price: 5,
            image: 'assets/seed-sunflower.svg',
            plantTypeId: 'sunflower'
        },
        {
            id: 'rose_seed',
            name: 'Hạt Hoa Hồng',
            description: 'Hạt giống hoa hồng, cần chăm sóc kỹ nhưng cho hoa đẹp.',
            price: 15,
            image: 'assets/seed-rose.svg',
            plantTypeId: 'rose'
        },
        {
            id: 'lavender_seed',
            name: 'Hạt Oải Hương',
            description: 'Hạt giống hoa oải hương, mùi thơm dễ chịu và màu tím đẹp mắt.',
            price: 20,
            image: 'assets/seed-lavender.svg',
            plantTypeId: 'lavender'
        },
        {
            id: 'cactus_seed',
            name: 'Hạt Xương Rồng',
            description: 'Hạt giống xương rồng, ít cần nước và dễ chăm sóc.',
            price: 25,
            image: 'assets/seed-cactus.svg',
            plantTypeId: 'cactus'
        },
        {
            id: 'bonsai_seed',
            name: 'Hạt Bonsai',
            description: 'Hạt giống cây bonsai, cần nhiều thời gian nhưng rất quý giá.',
            price: 30,
            image: 'assets/seed-bonsai.svg',
            plantTypeId: 'bonsai'
        },
        {
            id: 'lotus_seed',
            name: 'Hạt Sen',
            description: 'Hạt giống hoa sen, hiếm và đặc biệt, mang lại nhiều phần thưởng.',
            price: 50,
            image: 'assets/seed-lotus.svg',
            plantTypeId: 'lotus'
        },
        {
            id: 'cherry_seed',
            name: 'Hạt Anh Đào',
            description: 'Hạt giống hoa anh đào, nở hoa đẹp và mang lại nhiều may mắn.',
            price: 35,
            image: 'assets/seed-cherry.svg',
            plantTypeId: 'cherry'
        },
        {
            id: 'bamboo_seed',
            name: 'Hạt Tre',
            description: 'Hạt giống cây tre, phát triển nhanh và mang lại sự bình yên.',
            price: 25,
            image: 'assets/seed-bamboo.svg',
            plantTypeId: 'bamboo'
        },
        {
            id: 'dragonfruit_seed',
            name: 'Hạt Thanh Long',
            description: 'Hạt giống thanh long, cực kỳ hiếm và cho quả có giá trị cao.',
            price: 60,
            image: 'assets/seed-dragonfruit.svg',
            plantTypeId: 'dragonfruit'
        },
        {
            id: 'water_pack',
            name: 'Bình Nước',
            description: 'Thêm 10 đơn vị nước để tưới cây.',
            price: 10,
            image: 'assets/item-water.svg',
            effect: { water: 10 }
        },
        {
            id: 'energy_pack',
            name: 'Năng Lượng',
            description: 'Thêm 10 đơn vị năng lượng để chăm sóc vườn.',
            price: 10,
            image: 'assets/item-energy.svg',
            effect: { energy: 10 }
        },
        {
            id: 'fertilizer',
            name: 'Phân Bón',
            description: 'Giúp cây phát triển nhanh hơn 50%.',
            price: 20,
            image: 'assets/item-fertilizer.svg',
            effect: { growthBoost: 0.5 }
        },
        {
            id: 'garden_expansion',
            name: 'Mở Rộng Vườn',
            description: 'Thêm 3 ô trồng cây mới vào vườn của bạn.',
            price: 100,
            image: 'assets/item-expansion.svg',
            effect: { expandGarden: 3 }
        }
    ];
}

// Initialize achievements
function initializeAchievements() {
    achievements = [
        {
            id: 'first_plant',
            title: 'Người Trồng Cây Đầu Tiên',
            description: 'Trồng cây đầu tiên của bạn',
            icon: 'fa-seedling',
            reward: { coins: 10 },
            condition: (userData) => userData.plants && userData.plants.length >= 1,
            progress: (userData) => userData.plants ? Math.min(userData.plants.length, 1) : 0,
            total: 1
        },
        {
            id: 'plant_collector',
            title: 'Sưu Tầm Cây',
            description: 'Trồng 5 loại cây khác nhau',
            icon: 'fa-leaf',
            reward: { coins: 50 },
            condition: (userData) => {
                if (!userData.plants) return false;
                const uniquePlantTypes = new Set(userData.plants.map(plant => plant.typeId));
                return uniquePlantTypes.size >= 5;
            },
            progress: (userData) => {
                if (!userData.plants) return 0;
                const uniquePlantTypes = new Set(userData.plants.map(plant => plant.typeId));
                return Math.min(uniquePlantTypes.size, 5);
            },
            total: 5
        },
        {
            id: 'water_master',
            title: 'Bậc Thầy Tưới Nước',
            description: 'Tưới nước cho cây 20 lần',
            icon: 'fa-tint',
            reward: { coins: 30 },
            condition: (userData) => userData.stats && userData.stats.wateringCount >= 20,
            progress: (userData) => userData.stats ? Math.min(userData.stats.wateringCount || 0, 20) : 0,
            total: 20
        },
        {
            id: 'harvest_king',
            title: 'Vua Thu Hoạch',
            description: 'Thu hoạch 10 cây trưởng thành',
            icon: 'fa-hand-holding-heart',
            reward: { coins: 100 },
            condition: (userData) => userData.stats && userData.stats.harvestCount >= 10,
            progress: (userData) => userData.stats ? Math.min(userData.stats.harvestCount || 0, 10) : 0,
            total: 10
        },
        {
            id: 'garden_expander',
            title: 'Mở Rộng Vườn',
            description: 'Mở rộng vườn của bạn đến kích thước tối đa',
            icon: 'fa-expand',
            reward: { coins: 200 },
            condition: (userData) => userData.gardenSize >= 16,
            progress: (userData) => Math.min((userData.gardenSize || 9) - 9, 7),
            total: 7
        },
        {
            id: 'rich_gardener',
            title: 'Nhà Vườn Giàu Có',
            description: 'Sở hữu 500 xu',
            icon: 'fa-coins',
            reward: { coins: 50 },
            condition: (userData) => userData.resources && userData.resources.coins >= 500,
            progress: (userData) => userData.resources ? Math.min(userData.resources.coins || 0, 500) : 0,
            total: 500
        },
        {
            id: 'legendary_collector',
            title: 'Sưu Tầm Huyền Thoại',
            description: 'Sở hữu một cây huyền thoại',
            icon: 'fa-crown',
            reward: { coins: 300 },
            condition: (userData) => {
                if (!userData.plants) return false;
                return userData.plants.some(plant => {
                    const plantType = plantTypes.find(type => type.id === plant.typeId);
                    return plantType && plantType.rarity === 'legendary';
                });
            },
            progress: (userData) => {
                if (!userData.plants) return 0;
                return userData.plants.some(plant => {
                    const plantType = plantTypes.find(type => type.id === plant.typeId);
                    return plantType && plantType.rarity === 'legendary';
                }) ? 1 : 0;
            },
            total: 1
        },
        {
            id: 'social_gardener',
            title: 'Nhà Vườn Xã Hội',
            description: 'Thăm vườn của 5 người bạn',
            icon: 'fa-users',
            reward: { coins: 50 },
            condition: (userData) => userData.stats && userData.stats.friendGardensVisited >= 5,
            progress: (userData) => userData.stats ? Math.min(userData.stats.friendGardensVisited || 0, 5) : 0,
            total: 5
        }
    ];
}

// Setup user interface
function setupUserInterface() {
    // Show garden section
    document.getElementById('gardenSection').style.display = 'block';
    
    // Update auth buttons
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <div class="user-profile">
                <img src="${currentUser.photoURL || 'https://via.placeholder.com/40'}" alt="${currentUser.displayName || 'User'}" class="user-avatar">
                <span>${currentUser.displayName || 'User'}</span>
                <button id="logoutBtn" class="btn btn-small">Đăng Xuất</button>
            </div>
        `;
        
        // Add logout event listener
        document.getElementById('logoutBtn').addEventListener('click', function() {
            firebase.auth().signOut().then(() => {
                window.location.reload();
            }).catch((error) => {
                console.error('Logout error:', error);
            });
        });
    }
}

// Load user data from Firebase
function loadUserData() {
    const userId = currentUser.uid;
    const userRef = firebase.database().ref(`users/${userId}/garden`);
    
    userRef.once('value').then((snapshot) => {
        userData = snapshot.val() || {};
        
        // Initialize user data if not exists
        if (!userData.plants) {
            userData.plants = [];
        }
        
        if (!userData.seeds) {
            userData.seeds = [
                { id: 'sunflower_seed', count: 3 },
                { id: 'rose_seed', count: 1 }
            ];
        }
        
        if (!userData.resources) {
            userData.resources = {
                water: 10,
                energy: 20,
                coins: 50
            };
        }
        
        if (!userData.achievements) {
            userData.achievements = [];
        }
        
        if (!userData.gardenSize) {
            userData.gardenSize = 9; // 3x3 grid
        }
        
        if (!userData.stats) {
            userData.stats = {
                wateringCount: 0,
                harvestCount: 0,
                plantingCount: 0,
                friendGardensVisited: 0
            };
        }
        
        // Update global variables
        userPlants = userData.plants;
        userSeeds = userData.seeds;
        userResources = userData.resources;
        userAchievements = userData.achievements;
        gardenSize = userData.gardenSize;
        
        // Render garden
        renderGarden();
        
        // Render collection
        renderCollection();
        
        // Render shop
        renderShop();
        
        // Render achievements
        renderAchievements();
        
        // Load friend gardens
        loadFriendGardens();
        
        // Calculate offline growth first
        calculateOfflineGrowth();
        
        // Start plant growth timer
        startGrowthTimer();
        
        // Start weather effect system
        startWeatherEffectSystem();
        
        // Check for achievements
        checkAchievements(userData);
        
        // Save initial data if new user
        if (!snapshot.exists()) {
            saveUserData();
        }
    }).catch((error) => {
        console.error('Error loading user data:', error);
    });
}

// Render garden grid
function renderGarden() {
    const gardenGrid = document.getElementById('gardenGrid');
    gardenGrid.innerHTML = '';
    
    // Update resource counters
    document.getElementById('plantCount').textContent = userPlants.length;
    document.getElementById('waterCount').textContent = userResources.water;
    document.getElementById('energyCount').textContent = userResources.energy;
    document.getElementById('coinCount').textContent = userResources.coins;
    
    // Create garden plots
    for (let i = 0; i < gardenSize; i++) {
        const plot = document.createElement('div');
        plot.className = 'garden-plot';
        
        // Check if there's a plant in this plot
        const plant = userPlants.find(p => p.plotIndex === i);
        
        if (plant) {
            // Get plant type
            const plantType = plantTypes.find(type => type.id === plant.typeId);
            if (!plantType) continue;
            
            // Calculate growth stage
            const now = Date.now();
            const plantAge = (now - plant.plantedAt) / 1000; // in seconds
            const growthProgress = Math.min(plantAge / plantType.growthTime, 1);
            const stageIndex = Math.min(
                Math.floor(growthProgress * plantType.stages.length),
                plantType.stages.length - 1
            );
            
            // Calculate water level
            const timeSinceLastWatered = plant.lastWateredAt ? (now - plant.lastWateredAt) / 1000 : plantType.waterInterval;
            const waterLevel = Math.max(0, 1 - (timeSinceLastWatered / plantType.waterInterval));
            
            // Determine plant health status
            let healthStatus = 'healthy';
            if (waterLevel < 0.3) {
                healthStatus = 'thirsty';
            }
            
            // Create plant element with enhanced visuals
            plot.classList.add('has-plant');
            plot.innerHTML = `
                <div class="plant ${healthStatus}" data-plot-index="${i}">
                    <div class="plant-image" style="background-image: url('${plantType.stages[stageIndex].image}');"></div>
                    <div class="plant-info">
                        <div class="plant-name">${plantType.name}</div>
                        <div class="plant-stage">${plantType.stages[stageIndex].name}</div>
                    </div>
                    ${waterLevel < 0.3 ? '<div class="water-indicator"><i class="fas fa-tint-slash"></i></div>' : ''}
                    ${growthProgress >= 1 ? '<div class="harvest-indicator"><i class="fas fa-leaf"></i></div>' : ''}
                </div>
                <div class="soil"></div>
            `;
            
            // Add growth animation based on stage
            const plantElement = plot.querySelector('.plant');
            if (growthProgress < 1) {
                plantElement.classList.add('growing');
            } else {
                plantElement.classList.add('ready-to-harvest');
            }
            
            // Add thirsty class if water level is low
            if (waterLevel < 0.3) {
                plantElement.classList.add('thirsty');
            }
            
            // Add weather effects to plant if any
            updatePlantWithWeatherEffects(plantElement, plant);
            
            // Add event listener to show plant info
            plantElement.addEventListener('click', function() {
                showPlantInfo(i);
            });
        } else {
            // Empty plot with enhanced visuals
            plot.classList.add('empty');
            plot.setAttribute('data-plot-index', i);
            plot.innerHTML = `
                <div class="empty-plot-content">
                    <i class="fas fa-seedling"></i>
                </div>
                <div class="soil"></div>
            `;
            
            // Add event listener to plant new seed
            plot.addEventListener('click', function() {
                if (userResources.energy >= 1) {
                    selectedPlotIndex = i;
                    showPlantModal();
                } else {
                    showMessage('Không đủ năng lượng để trồng cây mới!', 'error');
                }
            });
        }
        
        gardenGrid.appendChild(plot);
    }
}

// Show plant modal
function showPlantModal() {
    const modal = document.getElementById('plantModal');
    const seedSelection = document.getElementById('seedSelection');
    seedSelection.innerHTML = '';
    
    // Reset selected seed
    selectedSeedIndex = -1;
    
    // Populate seed selection
    userSeeds.forEach((seed, index) => {
        if (seed.count > 0) {
            const shopItem = shopItems.find(item => item.id === seed.id);
            if (!shopItem) return;
            
            const seedItem = document.createElement('div');
            seedItem.className = 'seed-item';
            seedItem.innerHTML = `
                <div class="seed-image" style="background-image: url('${shopItem.image}');"></div>
                <div class="seed-name">${shopItem.name}</div>
                <div class="seed-count">Số lượng: ${seed.count}</div>
            `;
            
            seedItem.addEventListener('click', function() {
                // Remove selected class from all seeds
                document.querySelectorAll('.seed-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Add selected class to this seed
                seedItem.classList.add('selected');
                
                // Update selected seed index
                selectedSeedIndex = index;
            });
            
            seedSelection.appendChild(seedItem);
        }
    });
    
    // Show modal
    modal.style.display = 'flex';
    
    // Setup confirm button
    document.getElementById('confirmPlantBtn').addEventListener('click', function() {
        if (selectedSeedIndex >= 0) {
            plantSeed();
            modal.style.display = 'none';
        } else {
            showMessage('Vui lòng chọn hạt giống để trồng!', 'error');
        }
    });
    
    // Setup cancel button
    document.getElementById('cancelPlantBtn').addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Setup close button
    document.getElementById('closePlantModal').addEventListener('click', function() {
        modal.style.display = 'none';
    });
}

// Plant a seed
function plantSeed() {
    if (selectedPlotIndex < 0 || selectedSeedIndex < 0) return;
    
    const seed = userSeeds[selectedSeedIndex];
    if (seed.count <= 0) {
        showMessage('Không đủ hạt giống!', 'error');
        return;
    }
    
    // Find shop item for this seed
    const shopItem = shopItems.find(item => item.id === seed.id);
    if (!shopItem || !shopItem.plantTypeId) {
        showMessage('Hạt giống không hợp lệ!', 'error');
        return;
    }
    
    // Check if user has enough energy
    if (userResources.energy < 1) {
        showMessage('Không đủ năng lượng để trồng cây!', 'error');
        return;
    }
    
    // Decrease seed count
    seed.count--;
    
    // Decrease energy
    userResources.energy--;
    
    // Create new plant
    const newPlant = {
        id: generateId(),
        typeId: shopItem.plantTypeId,
        plotIndex: selectedPlotIndex,
        plantedAt: Date.now(),
        lastWateredAt: Date.now(), // Plants start with full water
        growthBoosts: []
    };
    
    // Add plant to user plants
    userPlants.push(newPlant);
    
    // Update stats
    if (!userData.stats) userData.stats = {};
    userData.stats.plantingCount = (userData.stats.plantingCount || 0) + 1;
    
    // Save user data
    saveUserData();
    
    // Render garden
    renderGarden();
    
    // Show success message
    showMessage('Đã trồng cây thành công!', 'success');
    
    // Check for achievements
    checkAchievements();
}

// Show plant info
function showPlantInfo(plotIndex) {
    const plant = userPlants.find(p => p.plotIndex === plotIndex);
    if (!plant) return;
    
    const plantType = plantTypes.find(type => type.id === plant.typeId);
    if (!plantType) return;
    
    // Calculate growth stage and progress
    const now = Date.now();
    const plantAge = (now - plant.plantedAt) / 1000; // in seconds
    const growthProgress = Math.min(plantAge / plantType.growthTime, 1);
    const stageIndex = Math.min(
        Math.floor(growthProgress * plantType.stages.length),
        plantType.stages.length - 1
    );
    
    // Calculate water level
    const timeSinceLastWatered = plant.lastWateredAt ? (now - plant.lastWateredAt) / 1000 : plantType.waterInterval;
    const waterLevel = Math.max(0, 1 - (timeSinceLastWatered / plantType.waterInterval));
    
    // Update modal content
    document.getElementById('plantInfoName').textContent = plantType.name;
    document.getElementById('plantInfoImage').src = plantType.stages[stageIndex].image;
    document.getElementById('plantInfoType').textContent = plantType.name;
    document.getElementById('plantInfoAge').textContent = formatTime(plantAge);
    document.getElementById('plantInfoStatus').textContent = plantType.stages[stageIndex].name;
    document.getElementById('plantInfoWater').textContent = `${Math.round(waterLevel * 100)}%`;
    
    // Add weather effect information if any
    const weatherEffectInfo = document.getElementById('weatherEffectInfo');
    if (weatherEffectInfo) {
        if (plant.weatherEffects && plant.weatherEffects.length > 0) {
            const effectNames = plant.weatherEffects.map(effect => weatherEffects[effect].name).join(', ');
            const valueBoost = Math.round((plant.valueMultiplier - 1) * 100);
            document.getElementById('plantInfoWeatherEffect').textContent = effectNames;
            document.getElementById('plantInfoWeatherBoost').textContent = `+${valueBoost}%`;
            weatherEffectInfo.style.display = 'block';
        } else {
            weatherEffectInfo.style.display = 'none';
        }
    }
    
    if (growthProgress >= 1) {
        document.getElementById('plantInfoHarvest').textContent = 'Sẵn sàng thu hoạch';
        document.getElementById('plantInfoProgress').style.width = '100%';
    } else {
        const timeLeft = plantType.growthTime - plantAge;
        document.getElementById('plantInfoHarvest').textContent = formatTime(timeLeft);
        document.getElementById('plantInfoProgress').style.width = `${growthProgress * 100}%`;
    }
    
    // Setup water button
    const waterBtn = document.getElementById('waterPlantBtn');
    waterBtn.disabled = waterLevel >= 0.9 || userResources.water <= 0;
    waterBtn.onclick = function() {
        waterPlant(plant.id);
        document.getElementById('plantInfoModal').style.display = 'none';
    };
    
    // Setup fertilize button
    const fertilizeBtn = document.getElementById('fertilizePlantBtn');
    fertilizeBtn.disabled = growthProgress >= 1;
    fertilizeBtn.onclick = function() {
        fertilizePlant(plant.id);
        document.getElementById('plantInfoModal').style.display = 'none';
    };
    
    // Setup remove button
    const removeBtn = document.getElementById('removePlantBtn');
    removeBtn.onclick = function() {
        removePlant(plant.id);
        document.getElementById('plantInfoModal').style.display = 'none';
    };
    
    // Show modal
    document.getElementById('plantInfoModal').style.display = 'flex';
    
    // Setup close button
    document.getElementById('closePlantInfoModal').addEventListener('click', function() {
        document.getElementById('plantInfoModal').style.display = 'none';
    });
}

// Water a plant
function waterPlant(plantId) {
    const plantIndex = userPlants.findIndex(p => p.id === plantId);
    if (plantIndex < 0) return;
    
    // Check if rain effect is active
    const isRainActive = currentWeatherEffect === 'rain';
    
    // If no rain effect, check if user has enough water
    if (!isRainActive && userResources.water <= 0) {
        showMessage('Không đủ nước để tưới cây!', 'error');
        return;
    }
    
    // Decrease water resource if no rain effect
    if (!isRainActive) {
        userResources.water--;
    }
    
    // Update plant's last watered time
    userPlants[plantIndex].lastWateredAt = Date.now();
    
    // Update stats
    if (!userData.stats) userData.stats = {};
    userData.stats.wateringCount = (userData.stats.wateringCount || 0) + 1;
    
    // Save user data
    saveUserData();
    
    // Render garden
    renderGarden();
    
    // Show water animation
    showWaterAnimation(userPlants[plantIndex].plotIndex);
    
    // Show success message based on whether rain effect is active
    if (isRainActive) {
        showMessage('Trời đang mưa! Cây được tưới nước miễn phí!', 'success');
    } else {
        showMessage('Đã tưới nước cho cây!', 'success');
    }
    
    // Check for achievements
    checkAchievements();
}

// Fertilize a plant
function fertilizePlant(plantId) {
    const plantIndex = userPlants.findIndex(p => p.id === plantId);
    if (plantIndex < 0) return;
    
    // Check if user has fertilizer
    const fertilizerIndex = userSeeds.findIndex(seed => seed.id === 'fertilizer');
    if (fertilizerIndex < 0 || userSeeds[fertilizerIndex].count <= 0) {
        showMessage('Không có phân bón! Hãy mua từ cửa hàng.', 'error');
        return;
    }
    
    // Decrease fertilizer count
    userSeeds[fertilizerIndex].count--;
    
    // Add growth boost to plant
    if (!userPlants[plantIndex].growthBoosts) {
        userPlants[plantIndex].growthBoosts = [];
    }
    
    userPlants[plantIndex].growthBoosts.push({
        amount: 0.5, // 50% boost
        appliedAt: Date.now()
    });
    
    // Save user data
    saveUserData();
    
    // Render garden
    renderGarden();
    
    // Show success message
    showMessage('Đã bón phân cho cây! Cây sẽ phát triển nhanh hơn.', 'success');
}

// Remove a plant
function removePlant(plantId) {
    const plantIndex = userPlants.findIndex(p => p.id === plantId);
    if (plantIndex < 0) return;
    
    // Remove plant
    userPlants.splice(plantIndex, 1);
    
    // Save user data
    saveUserData();
    
    // Render garden
    renderGarden();
    
    // Show success message
    showMessage('Đã xóa cây khỏi vườn!', 'success');
}

// Harvest a plant
function harvestPlant(plantId) {
    const plantIndex = userPlants.findIndex(p => p.id === plantId);
    if (plantIndex < 0) return;
    
    const plant = userPlants[plantIndex];
    const plantType = plantTypes.find(type => type.id === plant.typeId);
    if (!plantType) return;
    
    // Calculate growth progress
    const now = Date.now();
    const plantAge = (now - plant.plantedAt) / 1000; // in seconds
    const growthProgress = Math.min(plantAge / plantType.growthTime, 1);
    
    // Check if plant is ready to harvest
    if (growthProgress < 1) {
        showMessage('Cây chưa sẵn sàng để thu hoạch!', 'error');
        return;
    }
    
    // Add rewards with weather effect multiplier
    let rewardMultiplier = 1;
    
    // Apply weather effect multiplier if plant has any
    if (plant.weatherEffects && plant.weatherEffects.length > 0) {
        plant.weatherEffects.forEach(effect => {
            if (weatherEffects[effect]) {
                rewardMultiplier *= weatherEffects[effect].valueMultiplier;
            }
        });
    }
    
    // Apply value multiplier from plant if exists
    if (plant.valueMultiplier) {
        rewardMultiplier = plant.valueMultiplier;
    }
    
    // Calculate final reward
    if (plantType.harvestReward.coins) {
        const baseReward = plantType.harvestReward.coins;
        const finalReward = Math.round(baseReward * rewardMultiplier);
        userResources.coins += finalReward;
        
        // Show bonus message if multiplier is greater than 1
        if (rewardMultiplier > 1) {
            showMessage(`Hiệu ứng thời tiết tăng phần thưởng lên ${Math.round((rewardMultiplier - 1) * 100)}%!`, 'success');
        }
    }
    
    // Add seed of the same type (chance-based)
    const seedChance = Math.random();
    if (seedChance > 0.5) { // 50% chance to get seed
        const seedId = `${plantType.id}_seed`;
        const seedIndex = userSeeds.findIndex(seed => seed.id === seedId);
        
        if (seedIndex >= 0) {
            userSeeds[seedIndex].count++;
        } else {
            userSeeds.push({
                id: seedId,
                count: 1
            });
        }
    }
    
    // Update stats
    if (!userData.stats) userData.stats = {};
    userData.stats.harvestCount = (userData.stats.harvestCount || 0) + 1;
    
    // Remove plant
    userPlants.splice(plantIndex, 1);
    
    // Save user data
    saveUserData();
    
    // Render garden
    renderGarden();
    
    // Show success message with actual reward
    const actualReward = Math.round(plantType.harvestReward.coins * rewardMultiplier);
    showMessage(`Đã thu hoạch ${plantType.name}! Nhận được ${actualReward} xu.`, 'success');
    
    // Check for achievements
    checkAchievements();
}

// Harvest all ready plants
function harvestAllPlants() {
    const now = Date.now();
    let harvestedCount = 0;
    let totalCoins = 0;
    
    // Find all ready plants
    const readyPlants = userPlants.filter(plant => {
        const plantType = plantTypes.find(type => type.id === plant.typeId);
        if (!plantType) return false;
        
        const plantAge = (now - plant.plantedAt) / 1000;
        return plantAge >= plantType.growthTime;
    });
    
    // Harvest each plant
    readyPlants.forEach(plant => {
        const plantType = plantTypes.find(type => type.id === plant.typeId);
        if (!plantType) return;
        
        // Add rewards with weather effect multiplier
        let rewardMultiplier = 1;
        
        // Apply weather effect multiplier if plant has any
        if (plant.weatherEffects && plant.weatherEffects.length > 0) {
            plant.weatherEffects.forEach(effect => {
                if (weatherEffects[effect]) {
                    rewardMultiplier *= weatherEffects[effect].valueMultiplier;
                }
            });
        }
        
        // Apply value multiplier from plant if exists
        if (plant.valueMultiplier) {
            rewardMultiplier = plant.valueMultiplier;
        }
        
        // Calculate final reward
        if (plantType.harvestReward.coins) {
            const baseReward = plantType.harvestReward.coins;
            const finalReward = Math.round(baseReward * rewardMultiplier);
            userResources.coins += finalReward;
            totalCoins += finalReward;
        }
        
        // Add seed of the same type (chance-based)
        const seedChance = Math.random();
        if (seedChance > 0.5) { // 50% chance to get seed
            const seedId = `${plantType.id}_seed`;
            const seedIndex = userSeeds.findIndex(seed => seed.id === seedId);
            
            if (seedIndex >= 0) {
                userSeeds[seedIndex].count++;
            } else {
                userSeeds.push({
                    id: seedId,
                    count: 1
                });
            }
        }
        
        harvestedCount++;
    });
    
    // Update stats
    if (!userData.stats) userData.stats = {};
    userData.stats.harvestCount = (userData.stats.harvestCount || 0) + harvestedCount;
    
    // Remove harvested plants
    userPlants = userPlants.filter(plant => {
        const plantType = plantTypes.find(type => type.id === plant.typeId);
        if (!plantType) return true; // Keep plants with unknown type
        
        const plantAge = (now - plant.plantedAt) / 1000;
        return plantAge < plantType.growthTime; // Keep plants that are not ready
    });
    
    // Save user data
    saveUserData();
    
    // Render garden
    renderGarden();
    
    // Show success message
    if (harvestedCount > 0) {
        showMessage(`Đã thu hoạch ${harvestedCount} cây! Nhận được ${totalCoins} xu.`, 'success');
    } else {
        showMessage('Không có cây nào sẵn sàng để thu hoạch!', 'info');
    }
    
    // Check for achievements
    checkAchievements();
}

// Water all plants
function waterAllPlants() {
    // Check if there are any plants
    if (userPlants.length === 0) {
        showMessage('Không có cây nào để tưới!', 'info');
        return;
    }
    
    // Check if rain effect is active
    const isRainActive = currentWeatherEffect === 'rain';
    
    // If no rain effect, check if user has enough water
    if (!isRainActive && userResources.water < userPlants.length) {
        showMessage(`Không đủ nước! Cần ${userPlants.length} nước để tưới tất cả cây.`, 'error');
        return;
    }
    
    // Decrease water resource if no rain effect
    if (!isRainActive) {
        userResources.water -= userPlants.length;
    }
    
    // Update all plants' last watered time
    userPlants.forEach(plant => {
        plant.lastWateredAt = Date.now();
        
        // Show water animation for each plant
        showWaterAnimation(plant.plotIndex);
    });
    
    // Update stats
    if (!userData.stats) userData.stats = {};
    userData.stats.wateringCount = (userData.stats.wateringCount || 0) + userPlants.length;
    
    // Save user data
    saveUserData();
    
    // Render garden
    renderGarden();
    
    // Show success message based on whether rain effect is active
    if (isRainActive) {
        showMessage(`Trời đang mưa! Tất cả ${userPlants.length} cây được tưới nước miễn phí!`, 'success');
    } else {
        showMessage(`Đã tưới nước cho tất cả ${userPlants.length} cây!`, 'success');
    }
    
    // Check for achievements
    checkAchievements();
}

// Show water animation
function showWaterAnimation(plotIndex) {
    const plot = document.querySelector(`.garden-plot:nth-child(${plotIndex + 1})`);
    if (!plot) return;
    
    // Create water animation container
    const waterAnimation = document.createElement('div');
    waterAnimation.className = 'water-animation';
    
    // Create water drops
    for (let i = 0; i < 5; i++) {
        const drop = document.createElement('div');
        drop.className = 'water-drop';
        drop.style.left = `${Math.random() * 80 + 10}%`;
        drop.style.animationDelay = `${Math.random() * 0.5}s`;
        waterAnimation.appendChild(drop);
    }
    
    // Add animation to plot
    plot.appendChild(waterAnimation);
    
    // Remove animation after it completes
    setTimeout(() => {
        if (waterAnimation.parentNode === plot) {
            plot.removeChild(waterAnimation);
        }
    }, 1500);
}

// Biến toàn cục cho cửa hàng
let shopLastRefreshTime = localStorage.getItem('shopLastRefreshTime') ? parseInt(localStorage.getItem('shopLastRefreshTime')) : Date.now();
let shopInventory = localStorage.getItem('shopInventory') ? JSON.parse(localStorage.getItem('shopInventory')) : [];
const SHOP_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 phút

// Render shop
function renderShop() {
    const shopContainer = document.getElementById('shopItems');
    shopContainer.innerHTML = '';
    
    // Kiểm tra xem có cần làm mới cửa hàng không
    const now = Date.now();
    if (now - shopLastRefreshTime > SHOP_REFRESH_INTERVAL || shopInventory.length === 0) {
        refreshShopInventory();
    }
    
    // Tính thời gian còn lại cho đợt làm mới tiếp theo
    const timeLeft = Math.max(0, SHOP_REFRESH_INTERVAL - (now - shopLastRefreshTime));
    const minutesLeft = Math.floor(timeLeft / 60000);
    const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
    
    // Hiển thị thời gian làm mới
    const refreshTimeElement = document.createElement('div');
    refreshTimeElement.className = 'shop-refresh-time';
    refreshTimeElement.innerHTML = `<i class="fas fa-sync"></i> Làm mới trong: ${minutesLeft}:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;
    shopContainer.appendChild(refreshTimeElement);
    
    // Hiển thị nút mở túi đồ
    const inventoryButton = document.createElement('button');
    inventoryButton.className = 'btn btn-inventory';
    inventoryButton.innerHTML = '<i class="fas fa-backpack"></i> Mở Túi Đồ';
    inventoryButton.addEventListener('click', showInventory);
    shopContainer.appendChild(inventoryButton);
    
    // Populate shop items
    shopInventory.forEach(item => {
        const shopItem = document.createElement('div');
        shopItem.className = 'shop-item';
        
        // Thêm class cho độ hiếm
        if (item.rarity) {
            shopItem.classList.add(`rarity-${item.rarity}`);
        }
        
        shopItem.innerHTML = `
            <div class="item-image" style="background-image: url('${item.image}');"></div>
            <div class="item-name">${item.name}</div>
            <div class="item-description">${item.description}</div>
            <div class="item-price"><i class="fas fa-coins"></i> ${item.price}</div>
            ${item.quantity ? `<div class="item-quantity">Còn lại: ${item.quantity}</div>` : ''}
            <button class="btn btn-small" ${item.quantity === 0 ? 'disabled' : ''}>Mua</button>
        `;
        
        // Add event listener to buy button
        shopItem.querySelector('.btn').addEventListener('click', function() {
            if (item.quantity > 0) {
                buyItem(item.id);
                // Giảm số lượng sau khi mua
                item.quantity--;
                // Cập nhật lại hiển thị
                const quantityElement = shopItem.querySelector('.item-quantity');
                if (quantityElement) {
                    quantityElement.textContent = `Còn lại: ${item.quantity}`;
                }
                // Vô hiệu hóa nút nếu hết hàng
                if (item.quantity === 0) {
                    this.disabled = true;
                }
            }
        });
        
        shopContainer.appendChild(shopItem);
    });
    
    // Cập nhật thời gian làm mới mỗi giây
    const refreshInterval = setInterval(() => {
        const currentTime = Date.now();
        const remainingTime = Math.max(0, SHOP_REFRESH_INTERVAL - (currentTime - shopLastRefreshTime));
        const mins = Math.floor(remainingTime / 60000);
        const secs = Math.floor((remainingTime % 60000) / 1000);
        
        if (refreshTimeElement) {
            refreshTimeElement.innerHTML = `<i class="fas fa-sync"></i> Làm mới trong: ${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        
        if (remainingTime <= 0) {
            clearInterval(refreshInterval);
            renderShop(); // Làm mới cửa hàng khi hết thời gian
        }
    }, 1000);
    
    // Setup shop button
    document.getElementById('shopBtn').addEventListener('click', function() {
        document.getElementById('shopSection').style.display = 'block';
    });
    
    // Setup close shop button
    document.getElementById('closeShopBtn').addEventListener('click', function() {
        document.getElementById('shopSection').style.display = 'none';
        clearInterval(refreshInterval); // Dừng interval khi đóng cửa hàng
    });
}

// Làm mới hàng hóa trong cửa hàng
function refreshShopInventory() {
    shopLastRefreshTime = Date.now();
    shopInventory = [];
    
    // Tạo danh sách hàng hóa với số lượng giới hạn
    shopItems.forEach(item => {
        // Xác định độ hiếm và số lượng dựa trên giá
        let rarity, quantity;
        
        if (item.price < 50) {
            rarity = 'common';
            quantity = Math.floor(Math.random() * 5) + 5; // 5-10
        } else if (item.price < 100) {
            rarity = 'uncommon';
            quantity = Math.floor(Math.random() * 3) + 3; // 3-5
        } else if (item.price < 200) {
            rarity = 'rare';
            quantity = Math.floor(Math.random() * 2) + 1; // 1-2
        } else {
            rarity = 'legendary';
            quantity = Math.random() < 0.5 ? 1 : 0; // 50% có 1, 50% không có
        }
        
        // Thêm vào danh sách nếu có hàng
        if (Math.random() < 0.8 || item.id === 'water_pack' || item.id === 'energy_pack') { // 80% xuất hiện, nước và năng lượng luôn có
            shopInventory.push({
                ...item,
                rarity,
                quantity
            });
        }
    });
    
    // Lưu thời gian làm mới vào localStorage
    localStorage.setItem('shopLastRefreshTime', shopLastRefreshTime);
    localStorage.setItem('shopInventory', JSON.stringify(shopInventory));
}

// Hiển thị túi đồ
function showInventory() {
    // Tạo modal túi đồ
    const inventoryModal = document.createElement('div');
    inventoryModal.className = 'modal';
    inventoryModal.id = 'inventoryModal';
    inventoryModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Túi Đồ</h3>
                <button class="btn-close" id="closeInventoryModal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="inventory-items" id="inventoryItems"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(inventoryModal);
    
    // Hiển thị modal
    inventoryModal.style.display = 'flex';
    
    // Hiển thị danh sách vật phẩm trong túi đồ
    const inventoryItems = document.getElementById('inventoryItems');
    
    // Hiển thị hạt giống
    if (userSeeds && userSeeds.length > 0) {
        const seedsSection = document.createElement('div');
        seedsSection.className = 'inventory-section';
        seedsSection.innerHTML = '<h4>Hạt Giống</h4>';
        
        const seedsList = document.createElement('div');
        seedsList.className = 'inventory-grid';
        
        userSeeds.forEach(seed => {
            if (seed.count > 0) {
                const shopItem = shopItems.find(item => item.id === seed.id);
                if (shopItem) {
                    const seedItem = document.createElement('div');
                    seedItem.className = 'inventory-item';
                    seedItem.innerHTML = `
                        <div class="item-image" style="background-image: url('${shopItem.image}');"></div>
                        <div class="item-name">${shopItem.name}</div>
                        <div class="item-count">Số lượng: ${seed.count}</div>
                    `;
                    seedsList.appendChild(seedItem);
                }
            }
        });
        
        seedsSection.appendChild(seedsList);
        inventoryItems.appendChild(seedsSection);
    }
    
    // Hiển thị phân bón (nếu có)
    const fertilizerIndex = userSeeds.findIndex(seed => seed.id === 'fertilizer');
    if (fertilizerIndex >= 0 && userSeeds[fertilizerIndex].count > 0) {
        const fertilizerSection = document.createElement('div');
        fertilizerSection.className = 'inventory-section';
        fertilizerSection.innerHTML = '<h4>Phân Bón</h4>';
        
        const fertilizerList = document.createElement('div');
        fertilizerList.className = 'inventory-grid';
        
        const fertilizerItem = document.createElement('div');
        fertilizerItem.className = 'inventory-item';
        
        const fertilizerShopItem = shopItems.find(item => item.id === 'fertilizer');
        if (fertilizerShopItem) {
            fertilizerItem.innerHTML = `
                <div class="item-image" style="background-image: url('${fertilizerShopItem.image}');"></div>
                <div class="item-name">${fertilizerShopItem.name}</div>
                <div class="item-count">Số lượng: ${userSeeds[fertilizerIndex].count}</div>
            `;
        } else {
            fertilizerItem.innerHTML = `
                <div class="item-image" style="background-image: url('fertilizer.png');"></div>
                <div class="item-name">Phân Bón</div>
                <div class="item-count">Số lượng: ${userSeeds[fertilizerIndex].count}</div>
            `;
        }
        
        fertilizerList.appendChild(fertilizerItem);
        fertilizerSection.appendChild(fertilizerList);
        inventoryItems.appendChild(fertilizerSection);
    }
    
    // Hiển thị tài nguyên
    const resourcesSection = document.createElement('div');
    resourcesSection.className = 'inventory-section';
    resourcesSection.innerHTML = '<h4>Tài Nguyên</h4>';
    
    const resourcesList = document.createElement('div');
    resourcesList.className = 'inventory-resources';
    resourcesList.innerHTML = `
        <div class="resource-item">
            <i class="fas fa-water"></i>
            <span>Nước: ${userResources.water}</span>
        </div>
        <div class="resource-item">
            <i class="fas fa-sun"></i>
            <span>Năng lượng: ${userResources.energy}</span>
        </div>
        <div class="resource-item">
            <i class="fas fa-coins"></i>
            <span>Xu: ${userResources.coins}</span>
        </div>
    `;
    
    resourcesSection.appendChild(resourcesList);
    inventoryItems.appendChild(resourcesSection);
    
    // Thêm sự kiện đóng modal
    document.getElementById('closeInventoryModal').addEventListener('click', function() {
        document.body.removeChild(inventoryModal);
    });
    
    // Đóng modal khi click bên ngoài
    inventoryModal.addEventListener('click', function(event) {
        if (event.target === inventoryModal) {
            document.body.removeChild(inventoryModal);
        }
    });
}

// Buy an item from the shop
function buyItem(itemId) {
    const item = shopItems.find(item => item.id === itemId);
    if (!item) return;
    
    // Check if user has enough coins
    if (userResources.coins < item.price) {
        showMessage(`Không đủ xu! Cần ${item.price} xu để mua ${item.name}.`, 'error');
        return;
    }
    
    // Decrease coins
    userResources.coins -= item.price;
    
    // Apply item effect
    if (item.plantTypeId) {
        // It's a seed
        const seedIndex = userSeeds.findIndex(seed => seed.id === item.id);
        if (seedIndex >= 0) {
            userSeeds[seedIndex].count++;
        } else {
            userSeeds.push({
                id: item.id,
                count: 1
            });
        }
    } else if (item.effect) {
        // It's a resource or special item
        if (item.effect.water) {
            userResources.water += item.effect.water;
        }
        
        if (item.effect.energy) {
            userResources.energy += item.effect.energy;
        }
        
        if (item.effect.expandGarden) {
            gardenSize += item.effect.expandGarden;
            renderGarden();
        }
    }
    
    // Save user data
    saveUserData();
    
    // Update resource display
    document.getElementById('waterCount').textContent = userResources.water;
    document.getElementById('energyCount').textContent = userResources.energy;
    document.getElementById('coinCount').textContent = userResources.coins;
    
    // Show success message
    showMessage(`Đã mua ${item.name}!`, 'success');
    
    // Check for achievements
    checkAchievements();
}

// Render collection
function renderCollection() {
    const collectionContainer = document.getElementById('collectionGrid');
    if (!collectionContainer) {
        console.error('Collection container not found');
        return;
    }
    collectionContainer.innerHTML = '';
    
    // Group plants by type
    const plantCollection = {};
    plantTypes.forEach(type => {
        const found = userPlants.some(p => p.typeId === type.id);
        if (found) {
            plantCollection[type.id] = type;
        }
    });
    
    // Add discovered plants to collection
    Object.values(plantCollection).forEach(plant => {
        const collectionItem = document.createElement('div');
        collectionItem.className = 'collection-item';
        collectionItem.innerHTML = `
            <div class="item-image" style="background-image: url('${plant.stages[plant.stages.length - 1].image}');"></div>
            <div class="item-name">${plant.name}</div>
            <div class="item-rarity">${getRarityName(plant.rarity)}</div>
        `;
        collectionContainer.appendChild(collectionItem);
    });
    
    // Add placeholders for undiscovered plants
    const discoveredCount = Object.keys(plantCollection).length;
    const totalPlants = plantTypes.length;
    
    for (let i = 0; i < totalPlants - discoveredCount; i++) {
        const placeholderItem = document.createElement('div');
        placeholderItem.className = 'collection-item unknown';
        placeholderItem.innerHTML = `
            <div class="item-image" style="background-image: url('assets/plant-unknown.svg');"></div>
            <div class="item-name">???</div>
            <div class="item-rarity">Chưa khám phá</div>
        `;
        collectionContainer.appendChild(placeholderItem);
    }
}

// Load friend gardens
function loadFriendGardens() {
    // Khởi tạo mảng rỗng để chứa dữ liệu vườn bạn bè
    friendGardens = [];
    
    // Lấy danh sách người dùng từ Firebase
    const usersRef = firebase.database().ref('users');
    
    usersRef.once('value').then((snapshot) => {
        const users = snapshot.val();
        
        if (!users) {
            renderFriendGardens();
            return;
        }
        
        // Lọc ra các người dùng khác (không bao gồm người dùng hiện tại)
        Object.keys(users).forEach(userId => {
            // Bỏ qua người dùng hiện tại
            if (userId === currentUser.uid) return;
            
            const userData = users[userId];
            
            // Kiểm tra xem người dùng có dữ liệu vườn không
            if (userData.garden && userData.garden.plants) {
                // Tính toán số lượng cây hiếm
                let rareCount = 0;
                const plants = userData.garden.plants || [];
                
                // Tạo danh sách cây để hiển thị (tối đa 3 cây)
                const previewPlants = [];
                
                plants.forEach(plant => {
                    const plantType = plantTypes.find(type => type.id === plant.typeId);
                    if (plantType) {
                        // Tính toán giai đoạn phát triển của cây
                        const now = Date.now();
                        const plantAge = (now - plant.plantedAt) / 1000; // in seconds
                        const growthProgress = Math.min(plantAge / plantType.growthTime, 1);
                        const stageIndex = Math.min(
                            Math.floor(growthProgress * plantType.stages.length),
                            plantType.stages.length - 1
                        );
                        
                        // Thêm cây vào danh sách xem trước
                        if (previewPlants.length < 3) {
                            previewPlants.push({
                                typeId: plant.typeId,
                                stage: stageIndex
                            });
                        }
                        
                        // Đếm cây hiếm
                        if (plantType.rarity >= 3) { // Giả sử rarity >= 3 là hiếm
                            rareCount++;
                        }
                    }
                });
                
                // Thêm vườn của người dùng vào danh sách
                friendGardens.push({
                    userId: userId,
                    username: userData.displayName || userData.email || 'Người dùng ẩn danh',
                    avatar: userData.photoURL || 'assets/default-avatar.svg',
                    plants: previewPlants,
                    stats: {
                        plantCount: plants.length,
                        rareCount: rareCount
                    }
                });
            }
        });
        
        // Hiển thị danh sách vườn bạn bè
        renderFriendGardens();
    }).catch((error) => {
        console.error('Lỗi khi tải dữ liệu vườn bạn bè:', error);
        renderFriendGardens(); // Vẫn hiển thị UI ngay cả khi có lỗi
    });
}

// Render friend gardens
function renderFriendGardens() {
    const friendGardensContainer = document.getElementById('friendGardens');
    friendGardensContainer.innerHTML = '';
    
    // Kiểm tra nếu không có vườn bạn bè nào
    if (!friendGardens || friendGardens.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-users"></i>
            <p>Chưa có vườn bạn bè nào để hiển thị</p>
            <p class="empty-state-sub">Khi có người dùng khác tham gia, vườn của họ sẽ xuất hiện ở đây</p>
        `;
        friendGardensContainer.appendChild(emptyState);
        return;
    }
    
    // Hiển thị danh sách vườn bạn bè
    friendGardens.forEach(garden => {
        const gardenElement = document.createElement('div');
        gardenElement.className = 'friend-garden';
        
        // Create plant previews
        let plantPreviews = '';
        garden.plants.forEach(plant => {
            const plantType = plantTypes.find(type => type.id === plant.typeId);
            if (plantType) {
                plantPreviews += `
                    <div class="preview-plant" style="background-image: url('${plantType.stages[plant.stage].image}');"></div>
                `;
            }
        });
        
        // Nếu không có cây nào để hiển thị
        if (plantPreviews === '') {
            plantPreviews = `<div class="empty-preview">Chưa có cây</div>`;
        }
        
        gardenElement.innerHTML = `
            <div class="garden-header">
                <div class="user-avatar">
                    <img src="${garden.avatar}" alt="${garden.username}">
                </div>
                <div class="user-name">${garden.username}</div>
            </div>
            <div class="garden-preview">
                ${plantPreviews}
            </div>
            <div class="garden-stats">
                <span>${garden.stats.plantCount} cây</span> • 
                <span>${garden.stats.rareCount} cây hiếm</span>
            </div>
        `;
        
        // Add event listener to visit garden
        gardenElement.addEventListener('click', function() {
            visitFriendGarden(garden.userId);
        });
        
        friendGardensContainer.appendChild(gardenElement);
    });
}

// Visit a friend's garden
function visitFriendGarden(userId) {
    // Tìm thông tin vườn của bạn bè
    const friendGarden = friendGardens.find(garden => garden.userId === userId);
    if (!friendGarden) {
        showMessage('Không tìm thấy thông tin vườn của người dùng này', 'error');
        return;
    }
    
    // Hiển thị thông tin vườn trong modal
    document.getElementById('friendGardenUsername').textContent = `Vườn của ${friendGarden.username}`;
    document.getElementById('friendGardenPlantCount').textContent = friendGarden.stats.plantCount;
    document.getElementById('friendGardenRareCount').textContent = friendGarden.stats.rareCount;
    
    // Tải dữ liệu chi tiết về vườn từ Firebase
    const friendRef = firebase.database().ref(`users/${userId}/garden`);
    
    friendRef.once('value').then((snapshot) => {
        const friendData = snapshot.val() || {};
        const friendPlants = friendData.plants || [];
        
        // Hiển thị cây trong vườn của bạn bè
        renderFriendGardenGrid(friendPlants);
        
        // Hiển thị modal
        openModal('friendGardenModal');
        
        // Update stats
        if (!userData.stats) userData.stats = {};
        userData.stats.friendGardensVisited = (userData.stats.friendGardensVisited || 0) + 1;
        
        // Save user data
        saveUserData();
        
        // Check for achievements
        checkAchievements();
    }).catch((error) => {
        console.error('Lỗi khi tải dữ liệu vườn bạn bè:', error);
        showMessage('Không thể tải thông tin chi tiết về vườn này', 'error');
    });
}

// Render friend garden grid
function renderFriendGardenGrid(plants) {
    const friendGardenGrid = document.getElementById('friendGardenGrid');
    friendGardenGrid.innerHTML = '';
    
    // Nếu không có cây nào
    if (!plants || plants.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-seedling"></i>
            <p>Vườn này chưa có cây nào</p>
        `;
        friendGardenGrid.appendChild(emptyState);
        return;
    }
    
    // Hiển thị tất cả cây trong vườn
    plants.forEach(plant => {
        const plantType = plantTypes.find(type => type.id === plant.typeId);
        if (!plantType) return;
        
        // Tính toán giai đoạn phát triển
        const now = Date.now();
        const plantAge = (now - plant.plantedAt) / 1000; // in seconds
        const growthProgress = Math.min(plantAge / plantType.growthTime, 1);
        const stageIndex = Math.min(
            Math.floor(growthProgress * plantType.stages.length),
            plantType.stages.length - 1
        );
        
        // Tạo phần tử hiển thị cây
        const plotElement = document.createElement('div');
        plotElement.className = 'garden-plot';
        
        const plantContainer = document.createElement('div');
        plantContainer.className = 'plant-container';
        
        const plantImage = document.createElement('img');
        plantImage.className = 'plant-image';
        plantImage.src = plantType.stages[stageIndex].image;
        plantImage.alt = plantType.name;
        
        const plantInfo = document.createElement('div');
        plantInfo.className = 'plant-info';
        plantInfo.textContent = plantType.name;
        
        plantContainer.appendChild(plantImage);
        plantContainer.appendChild(plantInfo);
        plotElement.appendChild(plantContainer);
        
        friendGardenGrid.appendChild(plotElement);
    });
}

// Render achievements
function renderAchievements() {
    const achievementsGrid = document.getElementById('achievementsGrid');
    achievementsGrid.innerHTML = '';
    
    achievements.forEach(achievement => {
        const achievementElement = document.createElement('div');
        achievementElement.className = 'achievement';
        
        // Check if achievement is unlocked
        const isUnlocked = userAchievements.some(a => a.id === achievement.id);
        if (isUnlocked) {
            achievementElement.classList.add('unlocked');
        } else {
            achievementElement.classList.add('locked');
        }
        
        // Calculate progress
        const progress = achievement.progress(userData);
        const progressPercent = Math.min(100, (progress / achievement.total) * 100);
        
        achievementElement.innerHTML = `
            <div class="achievement-icon">
                <i class="fas ${achievement.icon}"></i>
            </div>
            <div class="achievement-title">${achievement.title}</div>
            <div class="achievement-description">${achievement.description}</div>
            <div class="achievement-progress">
                <div class="progress-bar">
                    <div class="progress" style="width: ${progressPercent}%"></div>
                </div>
                <div class="progress-text">${progress}/${achievement.total}</div>
            </div>
        `;
        
        achievementsGrid.appendChild(achievementElement);
    });
}

// Check for achievements
function checkAchievements() {
    let newAchievements = [];
    
    achievements.forEach(achievement => {
        // Skip already unlocked achievements
        if (userAchievements.some(a => a.id === achievement.id)) return;
        
        // Check if achievement condition is met
        if (achievement.condition(userData)) {
            // Unlock achievement
            const newAchievement = {
                id: achievement.id,
                unlockedAt: Date.now()
            };
            
            userAchievements.push(newAchievement);
            newAchievements.push(achievement);
            
            // Add reward
            if (achievement.reward.coins) {
                userResources.coins += achievement.reward.coins;
            }
        }
    });
    
    // Save user data if any new achievements
    if (newAchievements.length > 0) {
        saveUserData();
        renderAchievements();
        
        // Show achievement notification for the first new achievement
        showAchievementNotification(newAchievements[0]);
    }
}

// Show achievement notification
function showAchievementNotification(achievement) {
    // Update modal content
    document.getElementById('achievementTitle').textContent = achievement.title;
    document.getElementById('achievementDescription').textContent = achievement.description;
    document.getElementById('achievementReward').textContent = `${achievement.reward.coins} xu`;
    document.getElementById('achievementIcon').className = `fas ${achievement.icon}`;
    
    // Show modal
    document.getElementById('achievementModal').style.display = 'flex';
    
    // Setup close button
    document.getElementById('closeAchievementModal').addEventListener('click', function() {
        document.getElementById('achievementModal').style.display = 'none';
    });
    
    // Setup claim reward button
    document.getElementById('claimRewardBtn').addEventListener('click', function() {
        document.getElementById('achievementModal').style.display = 'none';
        showMessage(`Đã nhận ${achievement.reward.coins} xu từ thành tựu!`, 'success');
    });
}

// Start growth timer
function startGrowthTimer() {
    // Tính toán sự phát triển của cây khi người dùng quay lại
    calculateOfflineGrowth();
    
    // Lưu thời gian hiện tại khi người dùng đang hoạt động
    localStorage.setItem('lastActiveTime', Date.now());
    
    // Lắng nghe sự kiện khi người dùng rời trang
    window.addEventListener('beforeunload', function() {
        localStorage.setItem('lastActiveTime', Date.now());
    });
    
    // Update plants every 10 seconds
    setInterval(() => {
        const now = Date.now();
        let needsUpdate = false;
        
        userPlants.forEach(plant => {
            const plantType = plantTypes.find(type => type.id === plant.typeId);
            if (!plantType) return;
            
            // Check if plant needs water
            const timeSinceLastWatered = plant.lastWateredAt ? (now - plant.lastWateredAt) / 1000 : plantType.waterInterval;
            if (timeSinceLastWatered > plantType.waterInterval) {
                // Plant is thirsty, growth is slowed
                needsUpdate = true;
            }
        });
        
        // Regenerate energy and water over time
        if (userResources.energy < 20) {
            userResources.energy += 1;
            needsUpdate = true;
        }
        
        if (userResources.water < 10) {
            userResources.water += 1;
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            saveUserData();
            renderGarden();
        }
        
        // Cập nhật thời gian hoạt động cuối cùng
        localStorage.setItem('lastActiveTime', now);
    }, 10000);
}

// Tính toán sự phát triển của cây khi người dùng offline
function calculateOfflineGrowth() {
    const lastActiveTime = parseInt(localStorage.getItem('lastActiveTime'));
    if (!lastActiveTime) return;
    
    const now = Date.now();
    const offlineTime = (now - lastActiveTime) / 1000; // Thời gian offline tính bằng giây
    
    if (offlineTime < 60) return; // Nếu thời gian offline ít hơn 1 phút, không cần tính toán
    
    console.log(`Người dùng đã offline trong ${formatTime(offlineTime)}`);
    let needsUpdate = false;
    
    // Tính toán sự phát triển của cây trong thời gian offline
    userPlants.forEach(plant => {
        const plantType = plantTypes.find(type => type.id === plant.typeId);
        if (!plantType) return;
        
        // Cây vẫn phát triển khi offline, nhưng chậm hơn nếu thiếu nước
        const timeSinceLastWatered = plant.lastWateredAt ? (now - plant.lastWateredAt) / 1000 : plantType.waterInterval;
        const isThirsty = timeSinceLastWatered > plantType.waterInterval;
        
        // Cây phát triển chậm hơn 50% nếu thiếu nước
        const growthMultiplier = isThirsty ? 0.5 : 1;
        
        // Không cần cập nhật plantedAt vì chúng ta sẽ tính toán dựa trên thời gian thực
        needsUpdate = true;
    });
    
    // Tăng năng lượng và nước theo thời gian offline (tối đa)
    const energyGain = Math.min(Math.floor(offlineTime / 600), 20 - userResources.energy); // 10 phút/1 năng lượng
    const waterGain = Math.min(Math.floor(offlineTime / 900), 10 - userResources.water); // 15 phút/1 nước
    
    if (energyGain > 0) {
        userResources.energy += energyGain;
        needsUpdate = true;
    }
    
    if (waterGain > 0) {
        userResources.water += waterGain;
        needsUpdate = true;
    }
    
    if (needsUpdate) {
        saveUserData();
        renderGarden();
        showMessage(`Vườn của bạn đã phát triển trong ${formatTime(offlineTime)} bạn vắng mặt!`, 'success');
    }
}


// Save user data to Firebase
function saveUserData() {
    if (!currentUser) return;
    
    const userId = currentUser.uid;
    const userRef = firebase.database().ref(`users/${userId}/garden`);
    
    // Prepare data to save
    userData = {
        plants: userPlants,
        seeds: userSeeds,
        resources: userResources,
        achievements: userAchievements,
        gardenSize: gardenSize,
        stats: userData.stats || {}
    };
    
    // Save to Firebase
    userRef.set(userData).catch((error) => {
        console.error('Error saving user data:', error);
    });
}

// Helper function to open modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Close all modals first
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
    });
    
    // Open the requested modal
    modal.style.display = 'block';
}

// Helper function to close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Water all button
    document.getElementById('waterAllBtn').addEventListener('click', waterAllPlants);
    
    // Harvest all button
    document.getElementById('harvestAllBtn').addEventListener('click', harvestAllPlants);
    
    // Shop button
    document.getElementById('shopBtn').addEventListener('click', function() {
        document.getElementById('shopSection').style.display = 'block';
    });
    
    // Close shop button
    document.getElementById('closeShopBtn').addEventListener('click', function() {
        document.getElementById('shopSection').style.display = 'none';
    });
    
    // Start garden button
    document.getElementById('startGardenBtn').addEventListener('click', function() {
        if (currentUser) {
            document.getElementById('gardenSection').style.display = 'block';
            document.querySelector('.plant-hero').style.display = 'none';
        } else {
            document.getElementById('loginModal').style.display = 'flex';
        }
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Helper functions
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function formatTime(seconds) {
    if (seconds < 60) {
        return `${Math.floor(seconds)} giây`;
    } else if (seconds < 3600) {
        return `${Math.floor(seconds / 60)} phút`;
    } else {
        return `${Math.floor(seconds / 3600)} giờ ${Math.floor((seconds % 3600) / 60)} phút`;
    }
}

function getRarityName(rarity) {
    switch (rarity) {
        case 'common': return 'Phổ biến';
        case 'uncommon': return 'Không phổ biến';
        case 'rare': return 'Hiếm';
        case 'legendary': return 'Huyền thoại';
        default: return 'Không xác định';
    }
}

function showMessage(message, type = 'info') {
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <i class="fas ${getIconForMessageType(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(messageElement);
    
    // Animate in
    setTimeout(() => {
        messageElement.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        messageElement.classList.remove('show');
        setTimeout(() => {
            if (messageElement.parentNode === document.body) {
                document.body.removeChild(messageElement);
            }
        }, 300);
    }, 3000);
}

function getIconForMessageType(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info': 
        default: return 'fa-info-circle';
    }
}

// Weather effect functions

// Start random weather effect timer
function startWeatherEffectSystem() {
    // Check for weather effect every 5 minutes
    setInterval(() => {
        if (!currentWeatherEffect) {
            checkForRandomWeatherEffect();
        }
    }, weatherEffectCooldown);
}

// Check for random weather effect
function checkForRandomWeatherEffect() {
    // Random number between 0 and 1
    const random = Math.random();
    
    // Determine which weather effect to trigger, if any
    if (random < weatherEffects.rainbow.probability) {
        triggerWeatherEffect('rainbow');
    } else if (random < weatherEffects.rainbow.probability + weatherEffects.sandstorm.probability) {
        triggerWeatherEffect('sandstorm');
    } else if (random < weatherEffects.rainbow.probability + weatherEffects.sandstorm.probability + weatherEffects.rain.probability) {
        triggerWeatherEffect('rain');
    }
}

// Trigger a specific weather effect
function triggerWeatherEffect(effectType) {
    if (!weatherEffects[effectType]) return;
    
    currentWeatherEffect = effectType;
    
    // Apply effect to random plants (between 1 and 3 plants)
    const affectedPlantsCount = Math.floor(Math.random() * 3) + 1;
    const affectedPlants = [];
    
    // Select random plants to affect
    for (let i = 0; i < affectedPlantsCount && i < userPlants.length; i++) {
        const randomIndex = Math.floor(Math.random() * userPlants.length);
        const plant = userPlants[randomIndex];
        
        // Skip if plant already affected
        if (affectedPlants.includes(plant.id)) {
            i--;
            continue;
        }
        
        // Add weather effect to plant
        if (!plant.weatherEffects) {
            plant.weatherEffects = [];
        }
        
        // Check if plant already has this effect
        if (!plant.weatherEffects.includes(effectType)) {
            plant.weatherEffects.push(effectType);
            affectedPlants.push(plant.id);
            
            // Update plant value based on effect
            if (!plant.valueMultiplier) {
                plant.valueMultiplier = 1;
            }
            plant.valueMultiplier *= weatherEffects[effectType].valueMultiplier;
        }
    }
    
    // Show weather effect on garden
    showWeatherEffectAnimation(effectType);
    
    // Show message about weather effect
    showMessage(`${weatherEffects[effectType].name} đang ảnh hưởng đến ${affectedPlantsCount} cây trong vườn của bạn!`, 'info');
    
    // Save user data
    saveUserData();
    
    // Render garden to show effects
    renderGarden();
    
    // Set timer to end weather effect
    weatherEffectTimer = setTimeout(() => {
        endWeatherEffect();
    }, weatherEffectDuration);
}

// End current weather effect
function endWeatherEffect() {
    if (!currentWeatherEffect) return;
    
    // Clear weather effect from container
    const weatherContainer = document.getElementById('weatherEffectContainer');
    if (weatherContainer) {
        weatherContainer.innerHTML = '';
    }
    
    // Remove weather effects from plants
    userPlants.forEach(plant => {
        if (plant.weatherEffects && plant.weatherEffects.length > 0) {
            // Reset plant value multiplier
            plant.valueMultiplier = 1;
            // Clear weather effects
            plant.weatherEffects = [];
        }
    });
    
    // Reset current weather effect
    currentWeatherEffect = null;
    
    // Clear timer
    if (weatherEffectTimer) {
        clearTimeout(weatherEffectTimer);
        weatherEffectTimer = null;
    }
    
    // Re-render garden to update plant visuals
    renderGarden();
    
    // Show message
    showMessage('Hiệu ứng thời tiết đã kết thúc!', 'info');
    
    // Save user data
    saveUserData();
}

// Show weather effect animation on garden
function showWeatherEffectAnimation(effectType) {
    const weatherContainer = document.getElementById('weatherEffectContainer');
    if (!weatherContainer) return;
    
    // Clear previous effects
    weatherContainer.innerHTML = '';
    
    // Add effect-specific elements
    switch (effectType) {
        case 'rain':
            // Add rain drops
            for (let i = 0; i < 50; i++) {
                const raindrop = document.createElement('div');
                raindrop.className = 'rain-effect';
                raindrop.style.left = `${Math.random() * 100}%`;
                raindrop.style.animationDuration = `${0.5 + Math.random() * 1.5}s`;
                raindrop.style.animationDelay = `${Math.random() * 2}s`;
                weatherContainer.appendChild(raindrop);
            }
            break;
            
        case 'sandstorm':
            // Add sand particles
            for (let i = 0; i < 100; i++) {
                const sandParticle = document.createElement('div');
                sandParticle.className = 'sandstorm-effect';
                sandParticle.style.top = `${Math.random() * 100}%`;
                sandParticle.style.animationDuration = `${3 + Math.random() * 3}s`;
                sandParticle.style.animationDelay = `${Math.random() * 3}s`;
                weatherContainer.appendChild(sandParticle);
            }
            break;
            
        case 'rainbow':
            // Add rainbow effect
            const rainbow = document.createElement('div');
            rainbow.className = 'rainbow-effect';
            weatherContainer.appendChild(rainbow);
            break;
    }
    
    // Apply effect to affected plants
    userPlants.forEach(plant => {
        if (plant.weatherEffects && plant.weatherEffects.includes(effectType)) {
            const plotElement = document.querySelector(`.garden-plot[data-index="${plant.plotIndex}"]`);
            if (plotElement) {
                const plantElement = plotElement.querySelector('.plant');
                if (plantElement) {
                    plantElement.classList.add(weatherEffects[effectType].cssClass);
                }
            }
        }
    });
}

// Update renderGarden function to show weather effects on plants
function updatePlantWithWeatherEffects(plantElement, plant) {
    // Clear previous effects
    plantElement.classList.remove('rain-effect', 'sandstorm-effect', 'rainbow-effect');
    
    // Add current effects
    if (plant.weatherEffects && plant.weatherEffects.length > 0) {
        plant.weatherEffects.forEach(effect => {
            plantElement.classList.add(weatherEffects[effect].cssClass);
        });
    }
}
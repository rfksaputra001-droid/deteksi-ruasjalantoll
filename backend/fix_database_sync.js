const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import the DeteksiYOLO model
const DeteksiYOLO = require('./src/models/DeteksiYOLO');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://herkasaputra:jSJJmqLwgE9dZQNK@cluster0.eprvvbm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function checkAndUpdateDetections() {
  try {
    const uploadsDir = '/home/rifki/project/figma-mcp/yolo-backend  final/uploads/detections';
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('Uploads directory not found');
      return;
    }

    // Get all detection folders
    const detectionFolders = fs.readdirSync(uploadsDir).filter(dir => 
      fs.statSync(path.join(uploadsDir, dir)).isDirectory()
    );

    console.log(`Found ${detectionFolders.length} detection folders`);

    for (const folderId of detectionFolders) {
      const folderPath = path.join(uploadsDir, folderId);
      const resultsJsonPath = path.join(folderPath, 'results.json');
      const outputVideoPath = path.join(folderPath, 'output.mp4');
      
      // Check if detection is complete (has both results.json and output.mp4)
      const isComplete = fs.existsSync(resultsJsonPath) && fs.existsSync(outputVideoPath);
      
      if (isComplete) {
        console.log(`\nProcessing completed detection: ${folderId}`);
        
        // Try to parse the results.json file
        let resultsData = null;
        try {
          const resultsContent = fs.readFileSync(resultsJsonPath, 'utf8');
          resultsData = JSON.parse(resultsContent);
          console.log(`✓ Results JSON is valid for ${folderId}`);
        } catch (jsonError) {
          console.log(`❌ Results JSON is corrupted for ${folderId}:`, jsonError.message);
          
          // Try to fix the JSON by rebuilding it
          try {
            const content = fs.readFileSync(resultsJsonPath, 'utf8');
            const fixedContent = fixCorruptedJSON(content);
            if (fixedContent) {
              fs.writeFileSync(resultsJsonPath, JSON.stringify(fixedContent, null, 2));
              resultsData = fixedContent;
              console.log(`✓ Fixed corrupted JSON for ${folderId}`);
            }
          } catch (fixError) {
            console.log(`❌ Could not fix JSON for ${folderId}:`, fixError.message);
            continue;
          }
        }

        // Check if this detection exists in database
        const existingDetection = await DeteksiYOLO.findById(folderId);
        
        if (!existingDetection) {
          console.log(`❌ No database record found for ${folderId}`);
          // This is an orphaned detection folder - we could create a record or skip
          continue;
        }

        // Update database if detection is still showing as "processing"
        if (existingDetection.status === 'processing') {
          try {
            // Calculate summary from results
            let summary = {};
            if (resultsData && resultsData.detection_results) {
              const frames = resultsData.detection_results;
              summary = {
                total_frames: frames.length,
                max_vehicles: Math.max(...frames.map(f => f.count)),
                avg_confidence: frames.reduce((acc, f) => acc + f.confidence, 0) / frames.length
              };
            }

            // Update the detection record
            await DeteksiYOLO.findByIdAndUpdate(folderId, {
              status: 'completed',
              hasilDeteksi: resultsData,
              summary: summary,
              updatedAt: new Date()
            });

            console.log(`✅ Updated database status to completed for ${folderId}`);
          } catch (updateError) {
            console.log(`❌ Error updating database for ${folderId}:`, updateError.message);
          }
        } else {
          console.log(`✓ Database record already shows correct status (${existingDetection.status}) for ${folderId}`);
        }
      } else {
        console.log(`⏳ Detection incomplete for ${folderId}:`, {
          hasResults: fs.existsSync(resultsJsonPath),
          hasOutput: fs.existsSync(outputVideoPath)
        });
      }
    }
  } catch (error) {
    console.error('Error checking detections:', error);
  }
}

function fixCorruptedJSON(jsonString) {
  try {
    // Try to find where the JSON broke and fix it
    const lines = jsonString.split('\n');
    const detectionResults = [];
    
    let inResultsArray = false;
    let currentFrame = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('"detection_results"')) {
        inResultsArray = true;
        continue;
      }
      
      if (inResultsArray) {
        // Look for frame entries
        if (line.includes('"frame":')) {
          const frameMatch = line.match(/"frame":\s*(\d+)/);
          const countMatch = lines[i + 1] && lines[i + 1].match(/"count":\s*(\d+)/);
          const confMatch = lines[i + 2] && lines[i + 2].match(/"confidence":\s*([\d.]+)/);
          
          if (frameMatch && countMatch && confMatch) {
            detectionResults.push({
              frame: parseInt(frameMatch[1]),
              count: parseInt(countMatch[1]),
              confidence: parseFloat(confMatch[1])
            });
          }
        }
      }
    }
    
    if (detectionResults.length > 0) {
      return {
        detection_results: detectionResults,
        summary: {
          total_frames: detectionResults.length,
          max_vehicles: Math.max(...detectionResults.map(f => f.count)),
          avg_confidence: detectionResults.reduce((acc, f) => acc + f.confidence, 0) / detectionResults.length
        }
      };
    }
    
    return null;
  } catch (error) {
    console.log('Error fixing JSON:', error.message);
    return null;
  }
}

async function main() {
  console.log('Starting database synchronization...\n');
  
  await connectDB();
  await checkAndUpdateDetections();
  
  console.log('\nDatabase synchronization completed!');
  mongoose.connection.close();
  process.exit(0);
}

main().catch(error => {
  console.error('Script error:', error);
  mongoose.connection.close();
  process.exit(1);
});
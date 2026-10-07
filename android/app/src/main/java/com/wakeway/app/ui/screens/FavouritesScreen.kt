package com.wakeway.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CompassCalibration
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wakeway.app.data.model.Destination
import com.wakeway.app.ui.theme.DeepTeal
import com.wakeway.app.ui.theme.MutedSlate
import com.wakeway.app.ui.theme.Terracotta
import com.wakeway.app.ui.theme.WarmIvory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FavouritesScreen(
    favouritePlaces: List<Destination>,
    onOpenPlaceDetails: (Destination) -> Unit,
    onRemoveFavourite: (Destination) -> Unit,
    onExplorePlaces: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "FAVOURITES",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 2.sp,
                            color = DeepTeal
                        )
                        Text(
                            text = "Your saved travel stops & stations",
                            fontSize = 11.sp,
                            color = MutedSlate
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = WarmIvory)
            )
        },
        containerColor = WarmIvory
    ) { innerPadding ->
        if (favouritePlaces.isEmpty()) {
            // Friendly Empty State
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color(0xFFFAF2DF)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.FavoriteBorder,
                            contentDescription = null,
                            tint = Terracotta,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Text(
                        text = "Your favourite places will appear here.",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = DeepTeal
                    )

                    Text(
                        text = "Save destinations you visit often to quickly set your arrival wake-up alert.",
                        fontSize = 12.sp,
                        color = MutedSlate,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = onExplorePlaces,
                        colors = ButtonDefaults.buttonColors(containerColor = Terracotta),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Explore, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "EXPLORE PLACES", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(favouritePlaces, key = { it.placeId }) { place ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenPlaceDetails(place) },
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    if (place.category.isNotBlank()) {
                                        Text(
                                            text = place.category.uppercase(),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Terracotta
                                        )
                                    }
                                    Text(
                                        text = place.name,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = DeepTeal,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = place.address,
                                        fontSize = 11.sp,
                                        color = MutedSlate,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }

                                IconButton(onClick = { onRemoveFavourite(place) }) {
                                    Icon(
                                        imageVector = Icons.Default.Favorite,
                                        contentDescription = "Remove Favourite",
                                        tint = Terracotta
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
